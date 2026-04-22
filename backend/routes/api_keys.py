"""
[CONTEXT: ADMIN_CONSOLE] - API Keys Router
SC-API-KEYS-01: Admin gestiona tokens programáticos.

Endpoints (todos solo-admin):
  POST   /admin/api-keys          → crea y retorna raw UNA SOLA VEZ
  GET    /admin/api-keys          → lista las keys del admin actual (masked)
  PATCH  /admin/api-keys/{id}     → toggle is_active (revocar sin borrar)
  DELETE /admin/api-keys/{id}     → hard delete
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_admin
from models.api_key import ApiKey
from models.user import User
from schemas.api_key import ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse
from services.api_keys import generate_api_key

router = APIRouter()


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera una nueva API key. El raw se devuelve UNA SOLA VEZ."""
    raw, prefix, key_hash = generate_api_key()

    ak = ApiKey(
        user_id=current_admin.id,
        name=payload.name.strip(),
        key_hash=key_hash,
        prefix=prefix,
        expires_at=payload.expires_at,
    )
    db.add(ak)
    db.commit()
    db.refresh(ak)

    return ApiKeyCreatedResponse(
        id=ak.id,
        name=ak.name,
        prefix=ak.prefix,
        is_active=ak.is_active,
        expires_at=ak.expires_at,
        last_used_at=ak.last_used_at,
        usage_count=ak.usage_count,
        created_at=ak.created_at,
        key=raw,
    )


@router.get("/api-keys", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista las API keys del admin actual, más recientes primero."""
    rows = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == current_admin.id)
        .order_by(desc(ApiKey.created_at))
        .all()
    )
    return rows


class ApiKeyToggleRequest(BaseModel):
    is_active: bool


@router.patch("/api-keys/{key_id}", response_model=ApiKeyResponse)
def toggle_api_key(
    key_id: UUID,
    payload: ApiKeyToggleRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Activa o revoca una key sin borrarla (preserva historial de uso)."""
    ak = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.user_id == current_admin.id)
        .first()
    )
    if not ak:
        raise HTTPException(status_code=404, detail="API key no encontrada")

    ak.is_active = payload.is_active
    db.commit()
    db.refresh(ak)
    return ak


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(
    key_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Borra la key permanentemente."""
    ak = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.user_id == current_admin.id)
        .first()
    )
    if not ak:
        raise HTTPException(status_code=404, detail="API key no encontrada")
    db.delete(ak)
    db.commit()
    return None
