"""
[CONTEXT: NOTIFICATIONS] - Helper para crear notificaciones desde otros routers.

Uso:
    from services.notifications import notify

    notify(db, user_id=client.id, type="chat_message",
           title="Nueva respuesta", message="...",
           metadata={"thread_id": str(thread.id)},
           background_tasks=background_tasks)  # opcional → push WS

Si `background_tasks` se provee, además del INSERT en DB se programa un
push WebSocket al user (evento {"type": "notification", "payload": {...}}).
Si no se provee, solo se hace el INSERT (no realtime).

El helper hace try/except para que un fallo de notificación NUNCA tumbe
el flow principal.
"""
import logging
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from models.notification import Notification
from services.ws_manager import ws_manager

logger = logging.getLogger("cjdg.notifications")

VALID_TYPES = frozenset({
    "chat_message",
    "quotation_status",
    "invoice_created",
    "invoice_status",
})


def _serialize_notification(n: Notification) -> Dict[str, Any]:
    return {
        "id": str(n.id),
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "metadata": n.notification_metadata or {},
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


def notify(
    db: Session,
    *,
    user_id: UUID,
    type: str,
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    commit: bool = True,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Optional[Notification]:
    """Crea notif en DB y (opcional) la pushea por WS al user."""
    if type not in VALID_TYPES:
        logger.warning("notify(): tipo invalido '%s', se omite", type)
        return None

    try:
        n = Notification(
            user_id=user_id,
            type=type,
            title=title[:200],
            message=message,
            notification_metadata=metadata or {},
        )
        db.add(n)
        if commit:
            db.commit()
            db.refresh(n)
    except Exception as e:
        logger.exception("notify(): fallo al crear notificacion: %s", e)
        if commit:
            try:
                db.rollback()
            except Exception:
                pass
        return None

    # WS push (no bloquea — corre después de la respuesta HTTP)
    if background_tasks is not None and n is not None:
        event = {"type": "notification", "payload": _serialize_notification(n)}
        background_tasks.add_task(ws_manager.send_to_user, user_id, event)

    return n
