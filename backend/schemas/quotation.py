"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Quotation
"""
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from enum import Enum
from decimal import Decimal
from datetime import datetime

class QuotationStatus(str, Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"

class QuotationItemBase(BaseModel):
    catalog_item_id: int
    quantity: int
    precio_unitario: Optional[Decimal] = None
    observaciones: Optional[str] = None

class QuotationItemResponse(QuotationItemBase):
    id: int
    
    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    user_id: UUID
    status: QuotationStatus = QuotationStatus.PENDING
    notas_cliente: Optional[str] = None

class QuotationCreate(BaseModel):
    cart_id: int
    notas_cliente: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []
    
    class Config:
        from_attributes = True
