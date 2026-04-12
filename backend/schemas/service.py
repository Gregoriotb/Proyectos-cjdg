"""
[CONTEXT: SERVICE_OPERATIONS] - Pydantic Schemas - Service
"""
from pydantic import BaseModel
from typing import Optional, Any, Dict

class ServiceBase(BaseModel):
    pilar_id: str
    nombre: str
    categoria: str

class ServiceCreate(ServiceBase):
    service_id: str # p. ej. 'tec-001'

class ServiceResponse(ServiceBase):
    id: int
    service_id: str
    marca: Optional[str] = None
    codigo_modelo: Optional[str] = None
    description: Optional[str] = None
    specs: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True
