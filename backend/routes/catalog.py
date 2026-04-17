"""
[CONTEXT: SERVICE_OPERATIONS] - Catalog Router
Gestiona el catálogo de servicios (Ancla de Verdad), permitiendo filtrarlo por pilares.
SC-CLIENT-01: Endpoint SSE para stock en tiempo real.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import sqlalchemy as sa
import asyncio
import json

from database import get_db
from models.service import Service
from models.catalog import CatalogItem
from schemas.catalog import CatalogItemResponse

router = APIRouter()


@router.get("")
def get_catalog(
    pilar_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Catalogo de productos fisicos paginado.
    Excluye servicios corporativos del brochure y productos sin nombre util.
    """
    from sqlalchemy.orm import joinedload

    # Prefijos de servicios corporativos (brochure) — NO son productos fisicos
    BROCHURE_PREFIXES = ("tec-", "cli-", "ene-", "civ-")

    try:
        query = (
            db.query(CatalogItem)
            .join(Service, CatalogItem.service_id == Service.id)
            .options(joinedload(CatalogItem.service))
            .filter(
                # Excluir servicios del brochure
                ~Service.service_id.like("tec-%"),
                ~Service.service_id.like("cli-%"),
                ~Service.service_id.like("ene-%"),
                ~Service.service_id.like("civ-%"),
                # Excluir nombres vacios o nulos
                Service.nombre.isnot(None),
                Service.nombre != "",
            )
        )

        if pilar_id:
            query = query.filter(Service.pilar_id == pilar_id)

        if search:
            term = f"%{search}%"
            query = query.filter(
                sa.or_(
                    Service.nombre.ilike(term),
                    Service.marca.ilike(term),
                    Service.codigo_modelo.ilike(term),
                )
            )

        skip = (page - 1) * page_size
        limit = page_size

        total = query.count()
        items = query.order_by(CatalogItem.id).offset(skip).limit(limit).all()

        result = []
        for item in items:
            srv = item.service
            result.append({
                "id": item.id,
                "service_id": item.service_id,
                "price": float(item.price) if item.price else None,
                "is_available": item.is_available,
                "stock": item.stock,
                "is_offer": item.is_offer,
                "discount_percentage": item.discount_percentage,
                "service": {
                    "id": srv.id,
                    "service_id": srv.service_id,
                    "pilar_id": srv.pilar_id,
                    "nombre": srv.nombre,
                    "categoria": srv.categoria,
                    "marca": srv.marca,
                    "codigo_modelo": srv.codigo_modelo,
                    "description": srv.description,
                    "specs": srv.specs,
                    "image_url": srv.image_url,
                } if srv else None,
            })

        return {"items": result, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()[-500:]}


@router.get("/stock-stream")
async def stock_stream():
    """
    SC-CLIENT-01: SSE (Server-Sent Events) para actualización de stock en tiempo real.
    El frontend escucha este stream y actualiza los contadores de stock sin recargar.
    """
    async def event_generator():
        from database import SessionLocal
        while True:
            try:
                db = SessionLocal()
                items = db.query(CatalogItem).filter(CatalogItem.is_available == True).all()
                stock_data = {item.id: item.stock for item in items}
                db.close()

                yield f"data: {json.dumps(stock_data)}\n\n"
            except Exception:
                yield f"data: {json.dumps({'error': 'db_error'})}\n\n"

            await asyncio.sleep(10)  # Emite cada 10 segundos

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
