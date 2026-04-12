"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Catalog
"""
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class CatalogItemBase(BaseModel):
    price: Optional[Decimal] = None
    is_available: bool = True
    stock: int = 0
    is_offer: bool = False
    discount_percentage: float = 0.0

class CatalogItemCreate(CatalogItemBase):
    service_id: int

class CatalogItemUpdate(BaseModel):
    price: Optional[Decimal] = None
    is_available: Optional[bool] = None
    stock: Optional[int] = None
    is_offer: Optional[bool] = None
    discount_percentage: Optional[float] = None

from schemas.service import ServiceResponse

class CatalogItemResponse(CatalogItemBase):
    id: int
    service_id: int
    
    # Información anidada del servicio original
    service: Optional[ServiceResponse] = None
    
    class Config:
        from_attributes = True
