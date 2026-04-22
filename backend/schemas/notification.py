"""
[CONTEXT: NOTIFICATIONS] - Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_obj(cls, n) -> "NotificationResponse":
        """Helper para mapear el atributo Python `notification_metadata` → campo `metadata`."""
        return cls(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            metadata=n.notification_metadata or {},
            is_read=n.is_read,
            created_at=n.created_at,
        )


class UnreadCountResponse(BaseModel):
    unread_count: int
