"""
[CONTEXT: ADMIN_CONSOLE] - Pydantic Schemas - ServiceCatalog
SC-ADMIN-02: Contrato de datos para servicios corporativos CJDG.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from decimal import Decimal


class PilarType(str, Enum):
    TECNOLOGIA = "TECNOLOGIA"
    CLIMATIZACION = "CLIMATIZACION"
    ENERGIA = "ENERGIA"
    CIVIL = "CIVIL"


class ServiceCatalogBase(BaseModel):
    pilar: PilarType
    nombre: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(None, ge=0, description="Null = cotización manual")
    precio_variable: bool = True
    activo: bool = True
    is_special: bool = False
    image_urls: Optional[list[str]] = None


class ServiceCatalogCreate(ServiceCatalogBase):
    pass


class ServiceCatalogUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=200)
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(None, ge=0)
    precio_variable: Optional[bool] = None
    activo: Optional[bool] = None
    is_special: Optional[bool] = None
    image_urls: Optional[list[str]] = None


class ServiceCatalogResponse(ServiceCatalogBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
