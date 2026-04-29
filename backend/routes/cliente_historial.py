"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Rutas Cliente del historial de transacciones (SC-03).

Endpoints (read-only, scoped por current_user.id):
  GET  /cliente/historial          — listado paginado
  GET  /cliente/historial/{id}     — detalle (con timeline derivado)

Seguridad:
- Filtro forzado por user_id == current_user.id en todas las queries.
- Si el id no pertenece al cliente, devolvemos 404 (no 403) para no revelar.
"""
from datetime import datetime
from math import ceil
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload

from database import get_db
from dependencies import get_current_user
from models.transaction_history import TransactionHistory, TransactionHistoryItem
from models.user import User
from schemas.historial import (
    HistorialDetail,
    HistorialItemResponse,
    HistorialListItem,
    HistorialListResponse,
    HistorialUserBrief,
    PaginationMeta,
)

router = APIRouter(prefix="/cliente/historial", tags=["Cliente Historial"])


def _user_brief(u: Optional[User]) -> Optional[HistorialUserBrief]:
    if not u:
        return None
    return HistorialUserBrief(
        id=u.id,
        full_name=u.full_name,
        email=u.email,
        phone=u.phone,
        company_name=u.company_name,
    )


def _derive_timeline(snapshot: Dict[str, Any], history: TransactionHistory) -> List[Dict[str, Any]]:
    """Genera un timeline mínimo a partir del snapshot + audit_trail."""
    timeline: List[Dict[str, Any]] = []
    created = snapshot.get("created_at")
    if created:
        timeline.append({"estado": "creada", "fecha": created, "descripcion": "Creada"})
    for entry in (snapshot.get("audit_trail") or []):
        timeline.append({
            "estado": entry.get("nuevo_estado"),
            "fecha": entry.get("at"),
            "descripcion": entry.get("motivo") or entry.get("action"),
        })
    timeline.append({
        "estado": history.status_at_archive,
        "fecha": history.archived_at.isoformat() if history.archived_at else None,
        "descripcion": "Archivada",
    })
    return timeline


@router.get("", response_model=HistorialListResponse)
def list_my_historial(
    tipo: Optional[str] = Query(None, description="invoice | quotation_thread"),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TransactionHistory).filter(TransactionHistory.user_id == current_user.id)

    if tipo:
        q = q.filter(TransactionHistory.source_type == tipo)
    if estado:
        q = q.filter(TransactionHistory.status_at_archive == estado)
    if fecha_desde:
        q = q.filter(TransactionHistory.archived_at >= fecha_desde)
    if fecha_hasta:
        q = q.filter(TransactionHistory.archived_at <= fecha_hasta)

    total = q.count()
    rows: List[TransactionHistory] = (
        q.order_by(TransactionHistory.archived_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    if not rows:
        return HistorialListResponse(
            data=[],
            pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=0),
        )

    history_ids = [r.id for r in rows]
    from sqlalchemy import func
    item_counts = dict(
        db.query(
            TransactionHistoryItem.history_id,
            func.count(TransactionHistoryItem.id),
        )
        .filter(TransactionHistoryItem.history_id.in_(history_ids))
        .group_by(TransactionHistoryItem.history_id)
        .all()
    )

    return HistorialListResponse(
        data=[
            HistorialListItem(
                id=r.id,
                source_type=r.source_type,  # type: ignore[arg-type]
                original_id=r.original_id,
                numero_documento=r.numero_documento,
                status_at_archive=r.status_at_archive,
                total=r.total,
                archived_at=r.archived_at,
                reactivated_at=r.reactivated_at,
                items_count=item_counts.get(r.id, 0),
                user=_user_brief(current_user),
            )
            for r in rows
        ],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


@router.get("/{historial_id}", response_model=HistorialDetail)
def get_my_historial_detail(
    historial_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(TransactionHistory)
        .options(selectinload(TransactionHistory.items))
        .filter(
            TransactionHistory.id == historial_id,
            TransactionHistory.user_id == current_user.id,
        )
        .first()
    )
    if not history:
        # 404, no 403 — no revelamos existencia de historiales ajenos
        raise HTTPException(status_code=404, detail="Historial no encontrado")

    snapshot = history.snapshot_data or {}
    return HistorialDetail(
        id=history.id,
        source_type=history.source_type,  # type: ignore[arg-type]
        original_id=history.original_id,
        numero_documento=history.numero_documento,
        status_at_archive=history.status_at_archive,
        total=history.total,
        archived_at=history.archived_at,
        archived_by=None,  # cliente no necesita ver quién archivó
        reactivated_at=history.reactivated_at,
        user=_user_brief(current_user),
        items=[HistorialItemResponse.model_validate(it) for it in (history.items or [])],
        snapshot={**snapshot, "timeline": _derive_timeline(snapshot, history)},
    )
