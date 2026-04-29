"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Rutas Admin del historial de transacciones (SC-02).

Endpoints:
  GET    /admin/historial                           — listado paginado con filtros
  GET    /admin/historial/{id}                      — detalle completo
  PATCH  /admin/historial/{id}/estado               — cambiar status_at_archive
  POST   /admin/historial/{id}/reactivar            — devolver al activo
  DELETE /admin/historial/{id}                      — borrar entrada (audit gone)
  POST   /admin/maintenance/sweep-quotations        — sweep manual de threads vencidos

Notas:
- Envelope {data, pagination} solo en estos endpoints (no en endpoints viejos).
- DELETE de historial item por item; el bulk delete + Excel export va en SC-07 (Fase 4).
"""
from datetime import datetime, timezone
from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from database import get_db
from dependencies import get_current_admin
from models.invoice import Invoice
from models.stock_movement import StockMovement
from models.transaction_history import TransactionHistory, TransactionHistoryItem
from models.user import User
from schemas.historial import (
    CambiarEstadoBody,
    CambiarEstadoResponse,
    DeleteResponse,
    HistorialDetail,
    HistorialItemResponse,
    HistorialListItem,
    HistorialListResponse,
    HistorialUserBrief,
    PaginationMeta,
    ReactivarBody,
    ReactivarResponse,
)
from services import archive_service
from services.excel_export import build_historial_workbook, filename_for_export

router = APIRouter(prefix="/historial", tags=["Admin Historial"])


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
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


def _list_item(history: TransactionHistory, items_count: int) -> HistorialListItem:
    return HistorialListItem(
        id=history.id,
        source_type=history.source_type,  # type: ignore[arg-type]
        original_id=history.original_id,
        numero_documento=history.numero_documento,
        status_at_archive=history.status_at_archive,
        total=history.total,
        archived_at=history.archived_at,
        reactivated_at=history.reactivated_at,
        items_count=items_count,
        user=_user_brief(history.user),
    )


# --------------------------------------------------------------------------
# GET /admin/historial — listado
# --------------------------------------------------------------------------
@router.get("", response_model=HistorialListResponse)
def list_historial(
    tipo: Optional[str] = Query(None, description="invoice | quotation_thread"),
    estado: Optional[str] = Query(None, description="status_at_archive (PENDING, PAID, closed, etc)"),
    cliente_id: Optional[str] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None, description="busca en numero_documento o full_name del cliente"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    q = (
        db.query(TransactionHistory)
        .options(joinedload(TransactionHistory.user))
    )

    if tipo:
        q = q.filter(TransactionHistory.source_type == tipo)
    if estado:
        q = q.filter(TransactionHistory.status_at_archive == estado)
    if cliente_id:
        q = q.filter(TransactionHistory.user_id == cliente_id)
    if fecha_desde:
        q = q.filter(TransactionHistory.archived_at >= fecha_desde)
    if fecha_hasta:
        q = q.filter(TransactionHistory.archived_at <= fecha_hasta)
    if search:
        like = f"%{search.strip()}%"
        q = q.outerjoin(User, User.id == TransactionHistory.user_id).filter(
            or_(
                TransactionHistory.numero_documento.ilike(like),
                User.full_name.ilike(like),
                User.email.ilike(like),
            )
        )

    total = q.count()
    if sort_order == "asc":
        q = q.order_by(TransactionHistory.archived_at.asc())
    else:
        q = q.order_by(TransactionHistory.archived_at.desc())

    rows: List[TransactionHistory] = q.offset((page - 1) * limit).limit(limit).all()

    if not rows:
        return HistorialListResponse(
            data=[],
            pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=0),
        )

    # Conteo de items por history_id en una sola query
    history_ids = [r.id for r in rows]
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
        data=[_list_item(r, item_counts.get(r.id, 0)) for r in rows],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


# --------------------------------------------------------------------------
# GET /admin/historial/{id} — detalle
# --------------------------------------------------------------------------
@router.get("/{historial_id}", response_model=HistorialDetail)
def get_historial_detail(
    historial_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    history = (
        db.query(TransactionHistory)
        .options(
            joinedload(TransactionHistory.user),
            selectinload(TransactionHistory.items),
        )
        .filter(TransactionHistory.id == historial_id)
        .first()
    )
    if not history:
        raise HTTPException(status_code=404, detail="Historial no encontrado")

    return HistorialDetail(
        id=history.id,
        source_type=history.source_type,  # type: ignore[arg-type]
        original_id=history.original_id,
        numero_documento=history.numero_documento,
        status_at_archive=history.status_at_archive,
        total=history.total,
        archived_at=history.archived_at,
        archived_by=history.archived_by,
        reactivated_at=history.reactivated_at,
        user=_user_brief(history.user),
        items=[HistorialItemResponse.model_validate(it) for it in (history.items or [])],
        snapshot=history.snapshot_data or {},
    )


# --------------------------------------------------------------------------
# PATCH /admin/historial/{id}/estado — cambiar status snapshot
# --------------------------------------------------------------------------
@router.patch("/{historial_id}/estado", response_model=CambiarEstadoResponse)
def cambiar_estado(
    historial_id: int,
    body: CambiarEstadoBody,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    history = db.query(TransactionHistory).filter(TransactionHistory.id == historial_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Historial no encontrado")

    history.status_at_archive = body.nuevo_estado.upper() if history.source_type == "invoice" else body.nuevo_estado.lower()
    if body.motivo:
        snap = dict(history.snapshot_data or {})
        snap.setdefault("audit_trail", []).append(
            {
                "actor_id": str(current_admin.id),
                "at": datetime.now(timezone.utc).isoformat(),
                "action": "cambiar_estado",
                "nuevo_estado": history.status_at_archive,
                "motivo": body.motivo,
            }
        )
        history.snapshot_data = snap

    db.commit()
    db.refresh(history)
    return CambiarEstadoResponse(message="Estado actualizado", nuevo_estado=history.status_at_archive)


# --------------------------------------------------------------------------
# POST /admin/historial/{id}/reactivar
# --------------------------------------------------------------------------
@router.post("/{historial_id}/reactivar", response_model=ReactivarResponse)
def reactivar(
    historial_id: int,
    body: ReactivarBody,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    history = db.query(TransactionHistory).filter(TransactionHistory.id == historial_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Historial no encontrado")
    if history.reactivated_at:
        raise HTTPException(status_code=400, detail="Esta transacción ya fue reactivada antes")

    archive_service.reactivate(db, historial_id, actor_user_id=current_admin.id)

    # Si es factura y se pidió un nuevo_estado, aplicarlo al original
    if history.source_type == "invoice" and body.nuevo_estado:
        try:
            inv_id = int(history.original_id)
            inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
            if inv:
                from models.invoice import InvoiceStatusEnum
                try:
                    inv.status = InvoiceStatusEnum(body.nuevo_estado.upper())
                except ValueError:
                    pass
        except ValueError:
            pass

    db.commit()
    db.refresh(history)

    return ReactivarResponse(
        message="Transacción reactivada",
        historial_id=history.id,
        source_type=history.source_type,
        original_id=history.original_id,
    )


# --------------------------------------------------------------------------
# DELETE /admin/historial/{id}
# --------------------------------------------------------------------------
@router.delete("/{historial_id}", response_model=DeleteResponse)
def delete_historial_entry(
    historial_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    history = db.query(TransactionHistory).filter(TransactionHistory.id == historial_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Historial no encontrado")

    db.delete(history)
    db.commit()
    return DeleteResponse(message=f"Historial #{historial_id} eliminado")


# --------------------------------------------------------------------------
# SC-07: GET /admin/historial/exportar — Excel
# --------------------------------------------------------------------------
@router.get("/exportar/xlsx")
def export_historial_excel(
    tipo: Optional[str] = Query(None, description="invoice | quotation_thread"),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Genera un .xlsx con tres hojas: Resumen, Detalle Items, Movimientos Stock."""
    q = db.query(TransactionHistory).options(
        joinedload(TransactionHistory.user),
        selectinload(TransactionHistory.items),
    )
    if tipo:
        q = q.filter(TransactionHistory.source_type == tipo)
    if fecha_desde:
        q = q.filter(TransactionHistory.archived_at >= fecha_desde)
    if fecha_hasta:
        q = q.filter(TransactionHistory.archived_at <= fecha_hasta)
    histories = q.order_by(TransactionHistory.archived_at.desc()).all()

    if not histories:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_DATA", "message": "No hay historial para exportar con esos filtros."},
        )

    # Movimientos de stock en el mismo rango (si aplica)
    stock_q = db.query(StockMovement)
    if fecha_desde:
        stock_q = stock_q.filter(StockMovement.created_at >= fecha_desde)
    if fecha_hasta:
        stock_q = stock_q.filter(StockMovement.created_at <= fecha_hasta)
    stock_movements = stock_q.order_by(StockMovement.created_at.desc()).all()

    output = build_historial_workbook(histories, stock_movements)
    filename = filename_for_export()
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# --------------------------------------------------------------------------
# SC-07: DELETE /admin/historial — bulk delete tras respaldo
# --------------------------------------------------------------------------
@router.delete("")
def bulk_delete_historial(
    confirmado: bool = Query(False, description="Confirmación explícita requerida"),
    tipo: Optional[str] = Query(None, description="invoice | quotation_thread (None = todos)"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Elimina TODO el historial (o filtrado por tipo). Requiere ?confirmado=true.
    Pensado para usarse SOLO después de exportar a Excel.
    """
    if not confirmado:
        raise HTTPException(
            status_code=400,
            detail={"code": "CONFIRMATION_REQUIRED", "message": "Pasa ?confirmado=true para confirmar."},
        )

    q = db.query(TransactionHistory)
    if tipo:
        q = q.filter(TransactionHistory.source_type == tipo)
    count = q.count()
    if not count:
        return DeleteResponse(message="No hay registros para eliminar")

    q.delete(synchronize_session=False)
    db.commit()
    return DeleteResponse(message=f"{count} registros eliminados del historial")


# --------------------------------------------------------------------------
# POST /admin/maintenance/sweep-quotations
# --------------------------------------------------------------------------
maintenance_router = APIRouter(prefix="/maintenance", tags=["Admin Maintenance"])


@maintenance_router.post("/sweep-quotations")
def sweep_quotations(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    count = archive_service.sweep_quotations(db)
    db.commit()
    return {"success": True, "archived": count}
