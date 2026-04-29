"""
[CONTEXT: INTEGRATIONS] - Notificaciones a clientes via ArtificialIC.

Cuando un admin responde en un thread de cotización, enviamos un WhatsApp
corto al cliente para avisarle que tiene una respuesta nueva.

Variables de entorno:
  ARTIFICIALIC_API_URL       (ej: https://artificialic.com)
  ARTIFICIALIC_API_KEY       (Bearer token: ak_...)
  ARTIFICIALIC_ORIGIN        (origen autorizado por la API key)
  ARTIFICIALIC_CHANNEL_TYPE  (opcional, default: WHATSAPP)
  CHAT_FRONTEND_URL          (opcional, link al chat en la notificación)

Si falta API_URL o API_KEY el sync se omite silenciosamente.
"""
from __future__ import annotations

import logging
import os
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload, selectinload

from core.external_api import ExternalAPIClient, ExternalAPIError
from database import SessionLocal
from models.chat_quotation import ChatMessage, QuotationThread
from models.invoice import Invoice
from models.user import User

logger = logging.getLogger(__name__)


def _get_client() -> Optional[ExternalAPIClient]:
    base_url = os.getenv("ARTIFICIALIC_API_URL")
    api_key = os.getenv("ARTIFICIALIC_API_KEY")
    if not base_url or not api_key:
        logger.info("ArtificialIC notify omitido: faltan ARTIFICIALIC_API_URL o ARTIFICIALIC_API_KEY")
        return None

    headers = {"Content-Type": "application/json"}
    origin = os.getenv("ARTIFICIALIC_ORIGIN")
    if origin:
        headers["Origin"] = origin
        headers["Referer"] = origin

    return ExternalAPIClient(
        base_url=base_url,
        api_key=api_key,
        auth_type="bearer",
        default_headers=headers,
        timeout=15.0,
    )


def _channel_type() -> str:
    return os.getenv("ARTIFICIALIC_CHANNEL_TYPE", "WHATSAPP")


def _ensure_contact(client: ExternalAPIClient, user: User) -> None:
    """Crea el contacto si no existe. 409 = ya existe, lo ignoramos."""
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
        if e.status_code in (409, 422, 400):
            logger.debug("ArtificialIC: contacto ya existe (%s)", e.status_code)
        else:
            logger.warning("ArtificialIC: fallo al crear contacto: %s", e)


def _format_message(m: ChatMessage) -> str:
    sender = {
        "client": "👤 Cliente",
        "admin": "🛠 Admin",
        "system": "⚙️ Sistema",
    }.get(m.sender_type, m.sender_type)
    text = (m.content or "").strip()
    line = f"{sender}: {text}" if text else f"{sender}:"
    if m.attachment_url:
        line += f"\n  📎 {m.attachment_name or 'archivo'}: {m.attachment_url}"
    return line


def _format_invoice(inv: Invoice) -> str:
    inv_type = inv.invoice_type.value if inv.invoice_type else "N/A"
    inv_status = inv.status.value if inv.status else "N/A"
    lines = [f"🧾 #{inv.id} [{inv_type} / {inv_status}] Total: ${inv.total}"]
    for it in (inv.items or []):
        lines.append(
            f"  • {it.descripcion} x{it.cantidad} → ${it.precio_unitario} = ${it.subtotal}"
        )
    if inv.notas:
        lines.append(f"  📝 {inv.notas}")
    return "\n".join(lines)


def _build_bundle_message(thread: QuotationThread, user: User, invoices, admin_message: str) -> str:
    """Arma el bundle completo: cliente + facturas + chat + mensaje del admin."""
    sections = []

    sections.append(
        f"🆕 *Nueva respuesta en cotización*\n"
        f"Servicio: {thread.service_name}\n"
        f"Estado: {thread.status}"
    )

    # Cliente
    client_lines = [
        "👤 *Cliente*",
        f"Nombre: {user.full_name or '—'}",
        f"Email: {user.email or '—'}",
        f"Teléfono: {user.phone or '—'}",
    ]
    if user.company_name:
        client_lines.append(f"Empresa: {user.company_name}")
    sections.append("\n".join(client_lines))

    # Mensaje actual del admin
    snippet = (admin_message or "").strip()
    if snippet:
        sections.append(f"💬 *Mensaje del admin*\n{snippet}")

    # Facturas
    if invoices:
        inv_text = "\n\n".join(_format_invoice(inv) for inv in invoices)
        sections.append(f"💼 *Facturas ({len(invoices)})*\n{inv_text}")

    # Historial de chat
    sorted_msgs = sorted(thread.messages or [], key=lambda x: x.created_at or 0)
    if sorted_msgs:
        chat_text = "\n".join(_format_message(m) for m in sorted_msgs)
        sections.append(f"📜 *Historial del chat*\n{chat_text}")

    chat_url = os.getenv("CHAT_FRONTEND_URL")
    if chat_url:
        sections.append(f"👉 Revisar en: {chat_url}")

    return "\n\n".join(sections)


def notify_admin_reply(thread_id: UUID, admin_message: str) -> None:
    """
    Cuando el admin responde en un thread, envía a ArtificialIC el bundle
    completo (cliente + facturas + historial + mensaje actual) por WhatsApp.
    Pensado para correr como BackgroundTask — abre su propia sesión.
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
            logger.warning("ArtificialIC notify: thread %s no encontrado", thread_id)
            return

        user = thread.client
        if not user or not user.phone:
            logger.info("ArtificialIC notify: cliente sin teléfono (thread %s)", thread_id)
            return

        invoices = (
            db.query(Invoice)
            .options(selectinload(Invoice.items))
            .filter(Invoice.user_id == user.id)
            .order_by(Invoice.created_at.asc())
            .all()
        )

        _ensure_contact(client, user)

        body = _build_bundle_message(thread, user, invoices, admin_message)
        # WhatsApp limita a ~4096 chars. Truncamos seguro a 3900 para dejar margen.
        if len(body) > 3900:
            body = body[:3900].rstrip() + "\n\n…(truncado)"

        try:
            client.post(
                "/api/v1/messages",
                json={
                    "phoneNumber": user.phone,
                    "channelType": _channel_type(),
                    "content": body,
                },
            )
            logger.info("ArtificialIC bundle enviado a %s (thread %s, %d chars)", user.phone, thread_id, len(body))
        except ExternalAPIError as e:
            logger.warning("ArtificialIC notify: fallo enviando a %s: %s", user.phone, e)
    except Exception:
        logger.exception("ArtificialIC notify: error inesperado en thread %s", thread_id)
    finally:
        db.close()
