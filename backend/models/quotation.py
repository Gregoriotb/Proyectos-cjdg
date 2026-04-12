"""
[CONTEXT: SERVICE_OPERATIONS] - SQLAlchemy Model - Quotation
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime, timezone

class QuotationStatusEnum(enum.Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(QuotationStatusEnum), default=QuotationStatusEnum.PENDING, nullable=False)
    notas_cliente = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=True)
    observaciones = Column(String, nullable=True)

    quotation = relationship("Quotation", back_populates="items")
    catalog_item = relationship("CatalogItem")
