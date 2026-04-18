"""
Schemas: Chat-Cotizaciones V2.1
Ruta: backend/schemas/chat_quotation.py
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from decimal import Decimal
from uuid import UUID


class ClientInfo(BaseModel):
    """Datos del cliente expuestos al admin en el panel de chat."""
    id: UUID
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True


class QuotationThreadCreate(BaseModel):
    service_id: Optional[int] = None
    service_name: str = Field(..., min_length=2, max_length=255)
    requirements: str = Field(..., min_length=10)
    location_notes: Optional[str] = Field(None, max_length=500)
    budget_estimate: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class QuotationThreadResponse(BaseModel):
    id: UUID
    client_id: UUID
    service_name: str
    company_name: Optional[str] = None
    client_address: Optional[str] = None
    location_notes: Optional[str] = None
    budget_estimate: Optional[Decimal] = None
    requirements: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    client_unread: int
    admin_unread: int
    client: Optional[ClientInfo] = None

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: str = "text"
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    sender_type: str
    sender_id: Optional[UUID] = None
    sender_name: Optional[str] = None
    content: str
    message_type: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None
    message_metadata: Optional[Any] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ThreadWithMessages(QuotationThreadResponse):
    messages: List[ChatMessageResponse]
    total_messages: int


class ThreadListItem(QuotationThreadResponse):
    last_message_preview: Optional[str] = None
    last_message_time: Optional[datetime] = None


class StatusUpdateRequest(BaseModel):
    new_status: str = Field(..., pattern="^(pending|active|quoted|negotiating|closed|cancelled)$")
