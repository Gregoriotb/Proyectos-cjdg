"""
[CONTEXT: NOTIFICATIONS] - SQLAlchemy Model - Notification
SC-NOTIF-01: Notificaciones in-app por usuario.

Nota: el atributo ORM `notification_metadata` se mapea a la columna SQL `metadata`
para evitar choque con SQLAlchemy `Base.metadata`. Mismo patrón que ChatMessage.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(String(50), nullable=False)         # 'chat_message' | 'invoice_created' | 'invoice_status' | 'quotation_status'
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    # Atributo Python `notification_metadata` → columna SQL `metadata`
    notification_metadata = Column("metadata", JSONB, default=dict)

    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_notifications_user_created", "user_id", "created_at"),
    )
