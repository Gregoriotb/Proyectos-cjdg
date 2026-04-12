"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Cart
"""
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class CartItemBase(BaseModel):
    catalog_item_id: int
    quantity: int = 1
    observaciones: Optional[str] = None

class CartItemCreate(CartItemBase):
    pass

class CartItemResponse(CartItemBase):
    id: int
    
    class Config:
        from_attributes = True

class CartBase(BaseModel):
    user_id: UUID

class CartResponse(CartBase):
    id: int
    items: List[CartItemResponse] = []
    
    class Config:
        from_attributes = True
