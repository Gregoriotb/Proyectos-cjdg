"""
[CONTEXT: ADMIN_CONSOLE] - Pydantic Schemas - ApiKey
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Nombre descriptivo de la key")
    expires_at: Optional[datetime] = Field(
        None,
        description="ISO 8601 UTC. Si se omite, la key no expira.",
    )


class ApiKeyResponse(BaseModel):
    """Respuesta pública — no incluye el raw key (ya no existe en DB)."""
    id: UUID
    name: str
    prefix: str
    is_active: bool
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Respuesta tras crear una key — incluye el raw UNA SOLA VEZ."""
    key: str = Field(..., description="Raw API key. Guárdala, no se mostrará de nuevo.")
