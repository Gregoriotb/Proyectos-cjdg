"""
[CONTEXT: SERVICE_OPERATIONS] - SQLAlchemy Model - Invoice
SC-CLIENT-01: Sistema de facturas separado de cotizaciones.
"""
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Enum, Numeric, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime, timezone


class InvoiceTypeEnum(enum.Enum):
    PRODUCT_SALE = "PRODUCT_SALE"
    SERVICE_QUOTATION = "SERVICE_QUOTATION"


class InvoiceStatusEnum(enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    invoice_type = Column(Enum(InvoiceTypeEnum), nullable=False)
    status = Column(Enum(InvoiceStatusEnum), default=InvoiceStatusEnum.PENDING, nullable=False)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    notas = Column(Text, nullable=True)

    # Referencia opcional a cotización de servicios
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)

    # FEAT-Historial-v2.4
    tipo_documento = Column(String(20), nullable=False, default="factura")  # 'factura' | 'nota_entrega'
    archivado_en = Column(DateTime(timezone=True), nullable=True, index=True)
    historial_id = Column(Integer, ForeignKey("transaction_history.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    descripcion = Column(String(300), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="items")
