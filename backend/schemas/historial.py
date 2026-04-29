"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Schemas Pydantic para el historial de transacciones (admin + cliente).

Decisiones aplicadas:
- Envelope {data, pagination} solo en endpoints nuevos.
- Estados retornados en inglés (mismo enum del backend); UI traduce.
- numero_documento se genera al archivar (INV-{id:06d} o COT-{first8(uuid)}).
"""
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ----------------------------- Cliente embed -----------------------------
class HistorialUserBrief(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------------------- Item -----------------------------
class HistorialItemResponse(BaseModel):
    id: int
    descripcion: str
    cantidad: int
    precio_unitario: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------------------- Listado (compacto) -----------------------------
class HistorialListItem(BaseModel):
    id: int
    source_type: Literal["invoice", "quotation_thread"]
    original_id: str
    numero_documento: str
    status_at_archive: str
    total: Optional[Decimal] = None
    archived_at: datetime
    reactivated_at: Optional[datetime] = None
    items_count: int = 0
    user: Optional[HistorialUserBrief] = None


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class HistorialListResponse(BaseModel):
    data: List[HistorialListItem]
    pagination: PaginationMeta


# ----------------------------- Detalle -----------------------------
class HistorialDetail(BaseModel):
    id: int
    source_type: Literal["invoice", "quotation_thread"]
    original_id: str
    numero_documento: str
    status_at_archive: str
    total: Optional[Decimal] = None
    archived_at: datetime
    archived_by: Optional[UUID] = None
    reactivated_at: Optional[datetime] = None
    user: Optional[HistorialUserBrief] = None
    items: List[HistorialItemResponse] = []
    snapshot: Dict[str, Any] = {}


# ----------------------------- Bodies de mutación -----------------------------
class CambiarEstadoBody(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None


class ReactivarBody(BaseModel):
    nuevo_estado: Optional[str] = None  # solo se aplica a invoices; threads ignoran


class CambiarEstadoResponse(BaseModel):
    success: bool = True
    message: str
    nuevo_estado: str


class ReactivarResponse(BaseModel):
    success: bool = True
    message: str
    historial_id: int
    source_type: str
    original_id: str


class DeleteResponse(BaseModel):
    success: bool = True
    message: str
