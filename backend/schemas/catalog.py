"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Catalog
"""
from pydantic import BaseModel
from typing import List, Optional
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


# V2.2 — Dashboard Home widget de ofertas
class ProductOfferResponse(BaseModel):
    catalog_id: int
    product_name: str
    brand: Optional[str] = None
    original_price: Decimal
    discount_percentage: float
    final_price: float
    stock: int
    image_urls: List[str] = []
    service_id: int
