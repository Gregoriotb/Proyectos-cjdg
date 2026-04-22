"""
[CONTEXT: ADMIN_CONSOLE] - SQLAlchemy Model - ApiKey
SC-API-KEYS-01: Tokens programáticos para acceso a endpoints expuestos.

- key_hash: SHA-256 hex del raw key. El raw NUNCA se guarda.
- prefix: primeros chars del raw (ej. "pcjdg_a1b2c3d4") para identificación
  en UI sin exponer el secreto.
- expires_at: NULL = nunca expira.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True)
    prefix = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
