"""
[CONTEXT: INTEGRATIONS] - Sync de cotizaciones finalizadas hacia ArtificialIC.

Cuando un thread de cotización pasa a status finalizado, enviamos a la API
externa de ArtificialIC:
  - Contacto del cliente (name, phoneNumber, email)
  - Cabecera con datos del cliente y servicio
  - Cada mensaje del chat como un mensaje
  - Cada factura del usuario como un mensaje resumen

Variables de entorno requeridas:
  ARTIFICIALIC_API_URL       (ej: https://artificialic.com)
  ARTIFICIALIC_API_KEY       (Bearer token: ak_...)
  ARTIFICIALIC_CHANNEL_TYPE  (opcional, default: WHATSAPP)

Si falta API_URL o API_KEY el sync se omite silenciosamente (no rompe el flujo).
"""
from __future__ import annotations

import logging
import os
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload, selectinload

from core.external_api import ExternalAPIClient, ExternalAPIError
from database import SessionLocal
from models.chat_quotation import ChatMessage, QuotationThread
from models.invoice import Invoice
from models.user import User

logger = logging.getLogger(__name__)

FINALIZED_STATUSES = {"closed", "completed", "finalized"}


def _get_client() -> Optional[ExternalAPIClient]:
    base_url = os.getenv("ARTIFICIALIC_API_URL")
    api_key = os.getenv("ARTIFICIALIC_API_KEY")
    if not base_url or not api_key:
        logger.info("ArtificialIC sync omitido: faltan ARTIFICIALIC_API_URL o ARTIFICIALIC_API_KEY")
        return None
    return ExternalAPIClient(
        base_url=base_url,
        api_key=api_key,
        auth_type="bearer",
        default_headers={"Content-Type": "application/json"},
        timeout=20.0,
    )


def _channel_type() -> str:
    return os.getenv("ARTIFICIALIC_CHANNEL_TYPE", "WHATSAPP")


def _upsert_contact(client: ExternalAPIClient, user: User) -> None:
    payload = {
        "name": user.full_name or user.username or "Cliente",
        "phoneNumber": user.phone,
    }
    if user.email:
        payload["email"] = user.email
    try:
        client.post("/api/v1/contacts", json=payload)
        logger.info("ArtificialIC: contacto creado para %s", user.phone)
    except ExternalAPIError as e:
        # 409/422 normalmente significa "ya existe". Lo ignoramos.
        if e.status_code in (409, 422, 400):
            logger.info("ArtificialIC: contacto ya existe (%s)", e.status_code)
        else:
            logger.warning("ArtificialIC: fallo al crear contacto: %s", e)


def _send_text(client: ExternalAPIClient, phone: str, content: str) -> bool:
    if not content.strip():
        return False
    try:
        client.post(
            "/api/v1/messages",
            json={
                "phoneNumber": phone,
                "channelType": _channel_type(),
                "content": content,
            },
        )
        return True
    except ExternalAPIError as e:
        logger.warning("ArtificialIC: fallo enviando mensaje a %s: %s", phone, e)
        return False


def _format_message(msg: ChatMessage) -> str:
    sender = {
        "client": "👤 Cliente",
        "admin": "🛠 Admin",
        "system": "⚙️ Sistema",
    }.get(msg.sender_type, msg.sender_type)
    parts = [f"{sender}: {msg.content or ''}".strip()]
    if msg.attachment_url:
        attach = msg.attachment_name or "archivo"
        parts.append(f"📎 {attach}: {msg.attachment_url}")
    return "\n".join(parts)


def _format_invoice(inv: Invoice) -> str:
    inv_type = inv.invoice_type.value if inv.invoice_type else "N/A"
    inv_status = inv.status.value if inv.status else "N/A"
    lines = [
        f"🧾 Factura #{inv.id}",
        f"Tipo: {inv_type}",
        f"Estado: {inv_status}",
        f"Total: ${inv.total}",
    ]
    items: List[str] = []
    for it in (inv.items or []):
        items.append(
            f"  • {it.descripcion} (x{it.cantidad}) — ${it.precio_unitario} = ${it.subtotal}"
        )
    if items:
        lines.append("Items:")
        lines.extend(items)
    if inv.notas:
        lines.append(f"Notas: {inv.notas}")
    return "\n".join(lines)


def sync_thread_to_artificialic(thread_id: UUID) -> None:
    """
    Envía a ArtificialIC el contexto completo de un thread cerrado.
    Pensado para correr como BackgroundTask — abre su propia sesión y
    captura todos los errores para no romper el flujo principal.
    """
    client = _get_client()
    if client is None:
        return

    db: Session = SessionLocal()
    try:
        thread: Optional[QuotationThread] = (
            db.query(QuotationThread)
            .options(
                joinedload(QuotationThread.client),
                selectinload(QuotationThread.messages),
            )
            .filter(QuotationThread.id == thread_id)
            .first()
        )
        if not thread:
            logger.warning("ArtificialIC sync: thread %s no encontrado", thread_id)
            return

        user: Optional[User] = thread.client
        if not user or not user.phone:
            logger.info(
                "ArtificialIC sync omitido para thread %s: cliente sin teléfono",
                thread_id,
            )
            return

        # 1. Upsert contacto
        _upsert_contact(client, user)

        # 2. Cabecera con datos del cliente
        header = (
            "📋 *Cotización finalizada*\n"
            f"Servicio: {thread.service_name}\n"
            f"Thread ID: {thread.id}\n"
            f"👤 Nombre: {user.full_name or '—'}\n"
            f"📧 Email: {user.email or '—'}\n"
            f"📞 Teléfono: {user.phone}"
        )
        if user.company_name:
            header += f"\n🏢 Empresa: {user.company_name}"
        _send_text(client, user.phone, header)

        # 3. Mensajes del chat en orden cronológico
        sorted_msgs = sorted(thread.messages or [], key=lambda m: m.created_at or 0)
        for msg in sorted_msgs:
            _send_text(client, user.phone, _format_message(msg))

        # 4. Facturas del usuario (productos + cotizaciones)
        invoices: List[Invoice] = (
            db.query(Invoice)
            .options(selectinload(Invoice.items))
            .filter(Invoice.user_id == user.id)
            .order_by(Invoice.created_at.asc())
            .all()
        )
        if invoices:
            _send_text(client, user.phone, f"💼 Total facturas registradas: {len(invoices)}")
            for inv in invoices:
                _send_text(client, user.phone, _format_invoice(inv))
        else:
            _send_text(client, user.phone, "💼 Sin facturas registradas todavía.")

        logger.info("ArtificialIC sync completado para thread %s", thread_id)
    except Exception:
        # No queremos que un fallo del sync rompa el flujo principal.
        logger.exception("ArtificialIC sync: error inesperado en thread %s", thread_id)
    finally:
        db.close()
