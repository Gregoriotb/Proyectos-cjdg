"""
[CONTEXT: NOTIFICATIONS] - Notifications Router (per-user inbox)
SC-NOTIF-01: Endpoints para listar, leer, marcar y borrar notificaciones.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models.notification import Notification
from models.user import User
from schemas.notification import NotificationResponse, UnreadCountResponse
from dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista notificaciones del usuario, más recientes primero."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    rows = q.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
    return [NotificationResponse.from_orm_obj(n) for n in rows]


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Endpoint barato para polling del badge."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .count()
    )
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca una notificación como leída (idempotente)."""
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if not n.is_read:
        n.is_read = True
        db.commit()
        db.refresh(n)
    return NotificationResponse.from_orm_obj(n)


@router.put("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca todas las notificaciones del usuario como leídas."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina una notificación (solo del owner)."""
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.delete(n)
    db.commit()
    return None
