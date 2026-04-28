"""
Routes: Chat-Cotizaciones V2.1 + V2.8 (WebSocket realtime)
Ruta: backend/routes/chat_quotation.py
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from dependencies import get_current_user, get_current_admin
from models.chat_quotation import QuotationThread, ChatMessage
from models.user import User
from models.invoice import Invoice
from schemas.chat_quotation import (
    QuotationThreadCreate, QuotationThreadResponse,
    ChatMessageCreate, ChatMessageResponse,
    ThreadWithMessages, ThreadListItem, StatusUpdateRequest,
    ClientInfo, InvoiceBrief,
)
from routes.uploads import upload_file_to_imgbb
from services.notifications import notify
from services.ws_manager import ws_manager
from services.artificialic_sync import sync_thread_to_artificialic
from services.profile_validator import require_complete_profile

router = APIRouter(prefix="/chat-quotations", tags=["Chat Quotations"])


def _ws_chat_message_event(serialized: ChatMessageResponse) -> dict:
    return {"type": "chat_message", "payload": serialized.model_dump(mode="json")}


def _ws_thread_updated_event(thread_id: UUID) -> dict:
    return {"type": "thread_updated", "payload": {"thread_id": str(thread_id)}}


# ============================================================
# HELPERS
# ============================================================

def _user_display_name(user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    first = (getattr(user, "first_name", None) or "").strip()
    last = (getattr(user, "last_name", None) or "").strip()
    if first or last:
        return f"{first} {last}".strip()
    return (getattr(user, "full_name", None) or getattr(user, "email", None) or "").strip() or None


def _get_sender_name(db: Session, sender_id: Optional[UUID]) -> Optional[str]:
    if not sender_id:
        return None
    user = db.query(User).filter(User.id == sender_id).first()
    return _user_display_name(user)


def _client_info(user: Optional[User]) -> Optional[ClientInfo]:
    if not user:
        return None
    return ClientInfo(
        id=user.id,
        full_name=getattr(user, "full_name", None),
        first_name=getattr(user, "first_name", None),
        last_name=getattr(user, "last_name", None),
        email=getattr(user, "email", None),
        phone=getattr(user, "phone", None),
        company_name=getattr(user, "company_name", None),
        address=getattr(user, "address", None),
    )


def _invoice_brief_list(db: Session, invoice_ids: List[int]) -> List[InvoiceBrief]:
    if not invoice_ids:
        return []
    rows = db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all()
    # Mantener orden original de invoice_ids
    by_id = {inv.id: inv for inv in rows}
    out: List[InvoiceBrief] = []
    for iid in invoice_ids:
        inv = by_id.get(iid)
        if inv is None:
            continue
        out.append(InvoiceBrief(
            id=inv.id,
            invoice_type=inv.invoice_type.value if hasattr(inv.invoice_type, "value") else str(inv.invoice_type),
            status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            total=inv.total,
            notas=getattr(inv, "notas", None),
            created_at=inv.created_at,
        ))
    return out


def _serialize_message(db: Session, msg: ChatMessage) -> ChatMessageResponse:
    invoices_payload = None
    if msg.message_type == "invoice_mention":
        ids = (msg.message_metadata or {}).get("invoice_ids") or []
        if isinstance(ids, list):
            invoices_payload = _invoice_brief_list(db, [int(i) for i in ids if isinstance(i, int) or (isinstance(i, str) and i.isdigit())])

    return ChatMessageResponse(
        id=msg.id,
        thread_id=msg.thread_id,
        sender_type=msg.sender_type,
        sender_id=msg.sender_id,
        sender_name=_get_sender_name(db, msg.sender_id) if msg.sender_type != "system" else None,
        content=msg.content,
        message_type=msg.message_type,
        attachment_url=msg.attachment_url,
        attachment_name=msg.attachment_name,
        attachment_type=msg.attachment_type,
        message_metadata=msg.message_metadata or {},
        read_at=msg.read_at,
        created_at=msg.created_at,
        invoices=invoices_payload,
    )


def _validate_and_attach_invoices(
    db: Session,
    data: ChatMessageCreate,
    owner_user_id,
) -> tuple[str, str, dict]:
    """
    Valida invoice_ids contra owner_user_id. Retorna (content, message_type, metadata).
    Cliente: owner = current_user.id
    Admin: owner = thread.client_id (solo facturas del cliente del hilo)
    """
    content = data.content or ""
    message_type = data.message_type or "text"
    metadata: dict = {}

    if data.invoice_ids:
        # Validar que todas pertenezcan al owner indicado
        invs = db.query(Invoice).filter(
            Invoice.id.in_(data.invoice_ids),
            Invoice.user_id == owner_user_id,
        ).all()
        valid_ids = [inv.id for inv in invs]
        missing = set(data.invoice_ids) - set(valid_ids)
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Facturas no válidas o no pertenecen al cliente: {sorted(missing)}",
            )
        message_type = "invoice_mention"
        metadata = {"invoice_ids": valid_ids}
        if not content.strip():
            content = f"Facturas referenciadas: #{', #'.join(str(i) for i in valid_ids)}"
    else:
        # Sin invoice_ids y sin contenido ni adjunto → rechazar
        if not content.strip() and not data.attachment_url:
            raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    return content, message_type, metadata


def _serialize_thread(thread: QuotationThread, *, include_client: bool) -> dict:
    return {
        "id": thread.id,
        "client_id": thread.client_id,
        "service_name": thread.service_name,
        "company_name": thread.company_name,
        "client_address": thread.client_address,
        "location_notes": thread.location_notes,
        "budget_estimate": thread.budget_estimate,
        "requirements": thread.requirements,
        "status": thread.status,
        "created_at": thread.created_at,
        "updated_at": thread.updated_at,
        "last_message_at": thread.last_message_at,
        "client_unread": thread.client_unread,
        "admin_unread": thread.admin_unread,
        "client": _client_info(thread.client) if include_client else None,
    }


# ============================================================
# CLIENT ENDPOINTS
# ============================================================

@router.post("/threads", response_model=QuotationThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation_thread(
    data: QuotationThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cliente crea un nuevo hilo de cotización. Extrae company_name/address del perfil.
    Requiere perfil completo.
    """
    require_complete_profile(current_user)

    thread = QuotationThread(
        client_id=current_user.id,
        service_id=data.service_id,
        service_name=data.service_name,
        company_name=getattr(current_user, "company_name", None),
        client_address=getattr(current_user, "address", None),
        location_notes=data.location_notes,
        budget_estimate=data.budget_estimate,
        requirements=data.requirements,
        status="pending",
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

    system_msg = ChatMessage(
        thread_id=thread.id,
        sender_type="system",
        content=f"📋 Nueva solicitud de cotización: {data.service_name}",
        message_type="system",
        message_metadata={
            "budget": str(data.budget_estimate) if data.budget_estimate else None,
            "location": data.location_notes,
        },
    )
    db.add(system_msg)

    client_msg = ChatMessage(
        thread_id=thread.id,
        sender_type="client",
        sender_id=current_user.id,
        content=data.requirements,
        message_type="text",
    )
    db.add(client_msg)

    thread.last_message_at = datetime.utcnow()
    thread.client_unread = 0
    thread.admin_unread = 2

    db.commit()
    db.refresh(thread)
    return QuotationThreadResponse(**_serialize_thread(thread, include_client=False))


@router.get("/my-threads", response_model=List[ThreadListItem])
async def get_my_threads(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(QuotationThread).filter(QuotationThread.client_id == current_user.id)
    if status_filter:
        query = query.filter(QuotationThread.status == status_filter)

    threads = query.order_by(QuotationThread.last_message_at.desc().nullslast()).all()

    result = []
    for thread in threads:
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.thread_id == thread.id
        ).order_by(ChatMessage.created_at.desc()).first()

        base = _serialize_thread(thread, include_client=False)
        base["last_message_preview"] = last_msg.content[:80] if last_msg else None
        base["last_message_time"] = last_msg.created_at if last_msg else None
        result.append(ThreadListItem(**base))
    return result


@router.get("/threads/{thread_id}", response_model=ThreadWithMessages)
async def get_thread_client(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = db.query(QuotationThread).options(
        joinedload(QuotationThread.messages).joinedload(ChatMessage.sender)
    ).filter(
        QuotationThread.id == thread_id,
        QuotationThread.client_id == current_user.id,
    ).first()

    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id,
        ChatMessage.sender_type == "admin",
        ChatMessage.read_at.is_(None),
    ).update({"read_at": datetime.utcnow()})

    thread.client_unread = 0
    db.commit()
    db.refresh(thread)

    messages_out = [_serialize_message(db, m) for m in thread.messages]

    return ThreadWithMessages(
        **_serialize_thread(thread, include_client=False),
        messages=messages_out,
        total_messages=len(messages_out),
    )


@router.post("/threads/{thread_id}/messages", response_model=ChatMessageResponse)
async def client_send_message(
    thread_id: UUID,
    data: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = db.query(QuotationThread).filter(
        QuotationThread.id == thread_id,
        QuotationThread.client_id == current_user.id,
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")
    if thread.status in ("closed", "cancelled"):
        raise HTTPException(status_code=400, detail="No puedes enviar mensajes en un hilo cerrado")

    content, message_type, metadata = _validate_and_attach_invoices(
        db, data, owner_user_id=current_user.id
    )

    msg = ChatMessage(
        thread_id=thread_id,
        sender_type="client",
        sender_id=current_user.id,
        content=content,
        message_type=message_type,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
        attachment_type=data.attachment_type,
        message_metadata=metadata or None,
    )
    db.add(msg)
    thread.last_message_at = datetime.utcnow()
    thread.admin_unread = (thread.admin_unread or 0) + 1
    db.commit()
    db.refresh(msg)

    serialized = _serialize_message(db, msg)

    # SC-WS-01: realtime push (envío directo, sin depender de subscribe_thread para evitar race)
    chat_event = _ws_chat_message_event(serialized)
    thread_event = _ws_thread_updated_event(thread.id)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, chat_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, chat_event)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, thread_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, thread_event)

    return serialized


@router.post("/threads/{thread_id}/attachments")
async def client_upload_attachment(
    thread_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = db.query(QuotationThread).filter(
        QuotationThread.id == thread_id,
        QuotationThread.client_id == current_user.id,
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    result = await upload_file_to_imgbb(file)
    return {
        "url": result["url"],
        "name": file.filename,
        "type": file.content_type or "application/octet-stream",
    }


# ============================================================
# ADMIN ENDPOINTS
# ============================================================

@router.get("/admin/threads", response_model=List[ThreadListItem])
async def get_all_threads(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = db.query(QuotationThread).options(joinedload(QuotationThread.client))
    if status_filter:
        query = query.filter(QuotationThread.status == status_filter)

    threads = query.order_by(QuotationThread.last_message_at.desc().nullslast()).all()

    result = []
    for thread in threads:
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.thread_id == thread.id
        ).order_by(ChatMessage.created_at.desc()).first()

        base = _serialize_thread(thread, include_client=True)
        base["last_message_preview"] = last_msg.content[:80] if last_msg else None
        base["last_message_time"] = last_msg.created_at if last_msg else None
        result.append(ThreadListItem(**base))
    return result


@router.get("/admin/threads/{thread_id}", response_model=ThreadWithMessages)
async def get_thread_admin(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    thread = db.query(QuotationThread).options(
        joinedload(QuotationThread.client),
        joinedload(QuotationThread.messages).joinedload(ChatMessage.sender),
    ).filter(QuotationThread.id == thread_id).first()

    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id,
        ChatMessage.sender_type == "client",
        ChatMessage.read_at.is_(None),
    ).update({"read_at": datetime.utcnow()})

    thread.admin_unread = 0
    db.commit()
    db.refresh(thread)

    messages_out = [_serialize_message(db, m) for m in thread.messages]

    return ThreadWithMessages(
        **_serialize_thread(thread, include_client=True),
        messages=messages_out,
        total_messages=len(messages_out),
    )


@router.post("/admin/threads/{thread_id}/messages", response_model=ChatMessageResponse)
async def admin_send_message(
    thread_id: UUID,
    data: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    thread = db.query(QuotationThread).filter(QuotationThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    # Admin solo puede referenciar facturas del cliente dueño del hilo
    content, message_type, metadata = _validate_and_attach_invoices(
        db, data, owner_user_id=thread.client_id
    )

    msg = ChatMessage(
        thread_id=thread_id,
        sender_type="admin",
        sender_id=current_admin.id,
        content=content,
        message_type=message_type,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
        attachment_type=data.attachment_type,
        message_metadata=metadata or None,
    )
    db.add(msg)
    thread.last_message_at = datetime.utcnow()
    if thread.status == "pending":
        thread.status = "active"
    thread.client_unread = (thread.client_unread or 0) + 1
    db.commit()
    db.refresh(msg)

    serialized = _serialize_message(db, msg)

    # SC-NOTIF-01: notificar al cliente que recibió respuesta del equipo
    notify(
        db,
        user_id=thread.client_id,
        type="chat_message",
        title=f"Nueva respuesta en: {thread.service_name}",
        message=(content[:160] + "...") if len(content) > 160 else content,
        metadata={"thread_id": str(thread.id)},
        background_tasks=background_tasks,
    )

    # SC-WS-01: realtime push directo
    chat_event = _ws_chat_message_event(serialized)
    thread_event = _ws_thread_updated_event(thread.id)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, chat_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, chat_event)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, thread_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, thread_event)

    return serialized


@router.post("/admin/threads/{thread_id}/attachments")
async def admin_upload_attachment(
    thread_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    thread = db.query(QuotationThread).filter(QuotationThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    result = await upload_file_to_imgbb(file)
    return {
        "url": result["url"],
        "name": file.filename,
        "type": file.content_type or "application/octet-stream",
    }


@router.patch("/admin/threads/{thread_id}/status", response_model=QuotationThreadResponse)
async def update_thread_status(
    thread_id: UUID,
    data: StatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    thread = db.query(QuotationThread).options(joinedload(QuotationThread.client)).filter(
        QuotationThread.id == thread_id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    old_status = thread.status
    thread.status = data.new_status

    system_msg = ChatMessage(
        thread_id=thread_id,
        sender_type="system",
        content=f"🔄 Estado actualizado: {old_status} → {data.new_status}",
        message_type="status_change",
        message_metadata={"old_status": old_status, "new_status": data.new_status},
    )
    db.add(system_msg)
    thread.client_unread = (thread.client_unread or 0) + 1
    thread.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(thread)
    db.refresh(system_msg)

    # SC-NOTIF-01: notificar al cliente del cambio de status
    notify(
        db,
        user_id=thread.client_id,
        type="quotation_status",
        title=f"Cotización: {thread.service_name}",
        message=f"Estado actualizado de '{old_status}' a '{data.new_status}'.",
        metadata={
            "thread_id": str(thread.id),
            "old_status": old_status,
            "new_status": data.new_status,
        },
        background_tasks=background_tasks,
    )

    # SC-WS-01: realtime push directo (mensaje de sistema + thread_updated a todos)
    serialized_sys = _serialize_message(db, system_msg)
    chat_event = _ws_chat_message_event(serialized_sys)
    thread_event = _ws_thread_updated_event(thread.id)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, chat_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, chat_event)
    background_tasks.add_task(ws_manager.send_to_user, thread.client_id, thread_event)
    background_tasks.add_task(ws_manager.broadcast_to_admins, thread_event)

    return QuotationThreadResponse(**_serialize_thread(thread, include_client=True))


@router.post("/admin/threads/{thread_id}/automate", status_code=status.HTTP_202_ACCEPTED)
async def automate_thread(
    thread_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """SC-INTEG-ARTIFICIALIC: dispara manualmente el sync hacia ArtificialIC."""
    thread = db.query(QuotationThread).filter(QuotationThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    background_tasks.add_task(sync_thread_to_artificialic, thread.id)
    return {"status": "queued", "thread_id": str(thread.id)}
