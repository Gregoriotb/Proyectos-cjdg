"""
Modelos: Chat-Cotizaciones V2.1
Ruta: backend/models/chat_quotation.py

Nota: el atributo ORM `message_metadata` se mapea a la columna SQL `metadata`
(nombre reservado por SQLAlchemy a nivel de atributo, no de columna).
"""
from sqlalchemy import Column, String, Text, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


class QuotationThread(Base):
    __tablename__ = "quotation_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # service_catalog.id es Integer; FK real contra esa tabla (tipos coincidentes).
    service_id = Column(Integer, ForeignKey("service_catalog.id", ondelete="SET NULL"), nullable=True)

    service_name = Column(String(255), nullable=False)
    company_name = Column(String(255))
    client_address = Column(Text)
    location_notes = Column(Text)
    budget_estimate = Column(Numeric(12, 2))
    requirements = Column(Text, nullable=False)

    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime(timezone=True))

    client_unread = Column(Integer, default=0)
    admin_unread = Column(Integer, default=0)

    client = relationship("User", foreign_keys=[client_id], back_populates="quotation_threads")
    service = relationship("ServiceCatalog", foreign_keys=[service_id])
    messages = relationship(
        "ChatMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("quotation_threads.id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(String(10), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")

    attachment_url = Column(Text)
    attachment_name = Column(String(255))
    attachment_type = Column(String(50))

    # El atributo ORM se llama `message_metadata` para evitar choque con Base.metadata;
    # la columna en Postgres sigue llamándose `metadata` (coincide con tu SQL en Neon).
    message_metadata = Column("metadata", JSONB, default=dict)
    read_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    thread = relationship("QuotationThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
