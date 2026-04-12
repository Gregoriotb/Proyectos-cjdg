"""
[CONTEXT: ADMIN_CONSOLE] - Pydantic Schemas - Ecommerce Settings
"""
from pydantic import BaseModel
from typing import Optional

class EcommerceSettingsBase(BaseModel):
    is_catalog_visible: bool = True
    are_prices_visible: bool = False  # Por defecto las cotizaciones pueden ser sin precio visible
    support_email: Optional[str] = "admin@proyectoscjdg.com"
    support_phone: Optional[str] = None

class EcommerceSettingsUpdate(BaseModel):
    is_catalog_visible: Optional[bool] = None
    are_prices_visible: Optional[bool] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None

class EcommerceSettingsResponse(EcommerceSettingsBase):
    id: int
    
    class Config:
        from_attributes = True
