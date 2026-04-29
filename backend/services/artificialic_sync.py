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

from sqlalchemy.orm import Session, joinedload

from core.external_api import ExternalAPIClient, ExternalAPIError
from database import SessionLocal
from models.chat_quotation import QuotationThread
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


def notify_admin_reply(thread_id: UUID, admin_message_snippet: str) -> None:
    """
    Envía un WhatsApp al cliente avisando que el admin respondió.
    Pensado para correr como BackgroundTask — abre su propia sesión.
    """
    client = _get_client()
    if client is None:
        return

    db: Session = SessionLocal()
    try:
        thread: Optional[QuotationThread] = (
            db.query(QuotationThread)
            .options(joinedload(QuotationThread.client))
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

        _ensure_contact(client, user)

        snippet = (admin_message_snippet or "").strip()
        if len(snippet) > 200:
            snippet = snippet[:200].rstrip() + "..."

        chat_url = os.getenv("CHAT_FRONTEND_URL")
        body = (
            f"📩 Tienes una nueva respuesta en tu cotización *{thread.service_name}*.\n"
            f"\n"
            f"✉️ {snippet}" if snippet else
            f"📩 Tienes una nueva respuesta en tu cotización *{thread.service_name}*."
        )
        if chat_url:
            body += f"\n\n👉 Revisa el chat: {chat_url}"

        try:
            client.post(
                "/api/v1/messages",
                json={
                    "phoneNumber": user.phone,
                    "channelType": _channel_type(),
                    "content": body,
                },
            )
            logger.info("ArtificialIC notify enviado a %s (thread %s)", user.phone, thread_id)
        except ExternalAPIError as e:
            logger.warning("ArtificialIC notify: fallo enviando a %s: %s", user.phone, e)
    except Exception:
        logger.exception("ArtificialIC notify: error inesperado en thread %s", thread_id)
    finally:
        db.close()
