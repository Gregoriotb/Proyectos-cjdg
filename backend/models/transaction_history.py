"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Tabla maestra de transacciones archivadas (facturas + cotizaciones).
Mantiene snapshot JSONB del original + items denormalizados para queries.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class TransactionHistory(Base):
    __tablename__ = "transaction_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 'invoice' | 'quotation_thread' — desnormalizado para queries simples
    source_type = Column(String(30), nullable=False)
    # int (invoice.id) o UUID stringified (thread.id) — guardado como string para uniformidad
    original_id = Column(String(50), nullable=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    numero_documento = Column(String(50), nullable=False)  # INV-000123 / COT-000007
    status_at_archive = Column(String(30), nullable=False)
    total = Column(Numeric(12, 2), nullable=True)
    snapshot_data = Column(JSONB, nullable=False)

    archived_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    archived_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reactivated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    archiver = relationship("User", foreign_keys=[archived_by])
    items = relationship(
        "TransactionHistoryItem",
        back_populates="history",
        cascade="all, delete-orphan",
    )


class TransactionHistoryItem(Base):
    __tablename__ = "transaction_history_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    history_id = Column(Integer, ForeignKey("transaction_history.id", ondelete="CASCADE"), nullable=False, index=True)

    descripcion = Column(String(300), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(12, 2), nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=True)

    history = relationship("TransactionHistory", back_populates="items")
