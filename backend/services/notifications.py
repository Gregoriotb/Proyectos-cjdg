"""
[CONTEXT: NOTIFICATIONS] - Helper para crear notificaciones desde otros routers.

Uso desde rutas existentes (chat, invoices, quotations):

    from services.notifications import notify

    notify(db, user_id=client.id, type="chat_message",
           title="Nueva respuesta", message="...", metadata={"thread_id": str(thread.id)})

El helper hace try/except para que un fallo de notificación NUNCA tumbe el flow
principal (ej: si la tabla aún no existe en producción).
"""
import logging
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session

from models.notification import Notification

logger = logging.getLogger("cjdg.notifications")

# Tipos válidos (frozenset para constant-time membership check)
VALID_TYPES = frozenset({
    "chat_message",
    "quotation_status",
    "invoice_created",
    "invoice_status",
})


def notify(
    db: Session,
    *,
    user_id: UUID,
    type: str,
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    commit: bool = True,
) -> Optional[Notification]:
    """
    Crea una notificación. Si falla, loguea pero NO levanta excepción.

    `commit=True` hace flush inmediato; usar `commit=False` si se va a hacer
    parte de una transacción más amplia que el caller cerrará.
    """
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
        return n
    except Exception as e:
        # No tumbar el flow principal por un fallo de notificación
        logger.exception("notify(): fallo al crear notificacion: %s", e)
        if commit:
            try:
                db.rollback()
            except Exception:
                pass
        return None
