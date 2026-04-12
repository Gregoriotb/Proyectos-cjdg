"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Invoice
SC-CLIENT-01: Contrato de datos para facturas.
"""
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from enum import Enum
from decimal import Decimal
from datetime import datetime


class InvoiceType(str, Enum):
    PRODUCT_SALE = "PRODUCT_SALE"
    SERVICE_QUOTATION = "SERVICE_QUOTATION"


class InvoiceStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"


class InvoiceItemBase(BaseModel):
    descripcion: str
    cantidad: int = 1
    precio_unitario: Decimal
    subtotal: Decimal


class InvoiceItemResponse(InvoiceItemBase):
    id: int

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int
    user_id: UUID
    invoice_type: InvoiceType
    status: InvoiceStatus
    total: Decimal
    notas: Optional[str] = None
    quotation_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True
