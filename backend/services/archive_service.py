"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Servicio de archivado de transacciones.

Mueve facturas e hilos de cotización al historial y permite reactivarlos.
Snapshot completo en JSONB + items denormalizados para queries.

Uso típico:
  - archive_invoice(db, invoice, admin_id)        → al marcarse PAID/CANCELLED/OVERDUE
  - archive_quotation_thread(db, thread, admin)   → 7 días después de fecha_concretada
  - reactivate(db, history_id, admin)             → admin reabre desde panel
  - sweep_quotations(db)                          → barre threads con TTL vencido (lazy)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload, selectinload

from models.chat_quotation import QuotationThread
from models.invoice import Invoice, InvoiceStatusEnum
from models.transaction_history import TransactionHistory, TransactionHistoryItem


QUOTATION_TTL_DAYS = 7
ARCHIVABLE_INVOICE_STATUSES = {
    InvoiceStatusEnum.PAID,
    InvoiceStatusEnum.CANCELLED,
    InvoiceStatusEnum.OVERDUE,
}
ARCHIVABLE_THREAD_STATUSES = {"closed", "cancelled", "quoted"}


def _format_invoice_number(invoice_id: int) -> str:
    return f"INV-{invoice_id:06d}"


def _format_quotation_number(thread_id) -> str:
    # thread.id es UUID; tomamos los primeros 8 chars en mayúsculas
    short = str(thread_id).replace("-", "")[:8].upper()
    return f"COT-{short}"


def _invoice_snapshot(inv: Invoice) -> dict:
    return {
        "id": inv.id,
        "user_id": str(inv.user_id),
        "invoice_type": inv.invoice_type.value if inv.invoice_type else None,
        "tipo_documento": inv.tipo_documento,
        "status": inv.status.value if inv.status else None,
        "total": str(inv.total) if inv.total is not None else None,
        "notas": inv.notas,
        "quotation_id": inv.quotation_id,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        "items": [
            {
                "id": it.id,
                "catalog_item_id": it.catalog_item_id,
                "descripcion": it.descripcion,
                "cantidad": it.cantidad,
                "precio_unitario": str(it.precio_unitario) if it.precio_unitario is not None else None,
                "subtotal": str(it.subtotal) if it.subtotal is not None else None,
            }
            for it in (inv.items or [])
        ],
    }


def _thread_snapshot(thread: QuotationThread) -> dict:
    return {
        "id": str(thread.id),
        "client_id": str(thread.client_id),
        "service_id": thread.service_id,
        "service_name": thread.service_name,
        "company_name": thread.company_name,
        "client_address": thread.client_address,
        "location_notes": thread.location_notes,
        "budget_estimate": str(thread.budget_estimate) if thread.budget_estimate is not None else None,
        "requirements": thread.requirements,
        "status": thread.status,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
        "fecha_concretada": thread.fecha_concretada.isoformat() if thread.fecha_concretada else None,
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "sender_id": str(m.sender_id) if m.sender_id else None,
                "content": m.content,
                "message_type": m.message_type,
                "attachment_url": m.attachment_url,
                "attachment_name": m.attachment_name,
                "metadata": m.message_metadata or {},
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in (thread.messages or [])
        ],
    }


def archive_invoice(
    db: Session,
    invoice: Invoice,
    *,
    archived_by: Optional[UUID] = None,
) -> TransactionHistory:
    """
    Mueve la factura al historial. Mantiene la fila original en `invoices`
    pero le marca archivado_en + historial_id (soft archive).
    Idempotente: si ya está archivada, devuelve el historial existente.
    """
    if invoice.archivado_en and invoice.historial_id:
        existing = db.query(TransactionHistory).filter(TransactionHistory.id == invoice.historial_id).first()
        if existing:
            return existing

    history = TransactionHistory(
        source_type="invoice",
        original_id=str(invoice.id),
        user_id=invoice.user_id,
        numero_documento=_format_invoice_number(invoice.id),
        status_at_archive=invoice.status.value if invoice.status else "UNKNOWN",
        total=invoice.total,
        snapshot_data=_invoice_snapshot(invoice),
        archived_by=archived_by,
    )
    db.add(history)
    db.flush()

    for it in (invoice.items or []):
        db.add(TransactionHistoryItem(
            history_id=history.id,
            descripcion=it.descripcion,
            cantidad=it.cantidad,
            precio_unitario=it.precio_unitario,
            subtotal=it.subtotal,
        ))

    invoice.archivado_en = datetime.now(timezone.utc)
    invoice.historial_id = history.id
    return history


def archive_quotation_thread(
    db: Session,
    thread: QuotationThread,
    *,
    archived_by: Optional[UUID] = None,
) -> TransactionHistory:
    """Mueve el thread de cotización al historial. Idempotente."""
    if thread.archivado_en and thread.historial_id:
        existing = db.query(TransactionHistory).filter(TransactionHistory.id == thread.historial_id).first()
        if existing:
            return existing

    history = TransactionHistory(
        source_type="quotation_thread",
        original_id=str(thread.id),
        user_id=thread.client_id,
        numero_documento=_format_quotation_number(thread.id),
        status_at_archive=thread.status or "UNKNOWN",
        total=thread.budget_estimate,
        snapshot_data=_thread_snapshot(thread),
        archived_by=archived_by,
    )
    db.add(history)
    db.flush()

    # Para threads, los "items" del historial son los mensajes resumidos
    for m in (thread.messages or []):
        db.add(TransactionHistoryItem(
            history_id=history.id,
            descripcion=f"[{m.sender_type}] {(m.content or '')[:280]}",
            cantidad=1,
            precio_unitario=None,
            subtotal=None,
        ))

    thread.archivado_en = datetime.now(timezone.utc)
    thread.historial_id = history.id
    return history


def reactivate(
    db: Session,
    history_id: int,
    *,
    actor_user_id: Optional[UUID] = None,
) -> TransactionHistory:
    """
    Reactiva una transacción archivada: limpia archivado_en del original y
    marca reactivated_at en el historial. Mantiene la entrada del historial
    para auditoría (no se borra).
    """
    history = db.query(TransactionHistory).filter(TransactionHistory.id == history_id).first()
    if not history:
        raise ValueError(f"TransactionHistory {history_id} no encontrado")

    if history.source_type == "invoice":
        try:
            inv_id = int(history.original_id)
        except ValueError:
            inv_id = None
        if inv_id is not None:
            inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
            if inv:
                inv.archivado_en = None
                inv.historial_id = None
    elif history.source_type == "quotation_thread":
        thread = db.query(QuotationThread).filter(QuotationThread.id == history.original_id).first()
        if thread:
            thread.archivado_en = None
            thread.historial_id = None

    history.reactivated_at = datetime.now(timezone.utc)
    return history


def sweep_quotations(db: Session) -> int:
    """
    Archiva todos los threads con status archivable cuya fecha_concretada
    es mayor a QUOTATION_TTL_DAYS días. Devuelve cantidad archivada.

    Llamado lazy desde GET /quotations admin y desde /admin/maintenance/sweep.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=QUOTATION_TTL_DAYS)
    candidates = (
        db.query(QuotationThread)
        .options(selectinload(QuotationThread.messages))
        .filter(
            QuotationThread.archivado_en.is_(None),
            QuotationThread.fecha_concretada.isnot(None),
            QuotationThread.fecha_concretada <= cutoff,
            QuotationThread.status.in_(list(ARCHIVABLE_THREAD_STATUSES)),
        )
        .all()
    )
    count = 0
    for thread in candidates:
        archive_quotation_thread(db, thread, archived_by=None)
        count += 1
    if count:
        db.flush()
    return count


def auto_archive_invoice_if_terminal(
    db: Session,
    invoice: Invoice,
    *,
    archived_by: Optional[UUID] = None,
) -> Optional[TransactionHistory]:
    """
    Helper para llamar después de cambiar status: archiva inmediatamente si
    el nuevo status es terminal (PAID/CANCELLED/OVERDUE).
    """
    if invoice.status in ARCHIVABLE_INVOICE_STATUSES and not invoice.archivado_en:
        return archive_invoice(db, invoice, archived_by=archived_by)
    return None
