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


@router.get("/", response_model=List[CatalogItemResponse])
def get_catalog(pilar_id: Optional[str] = Query(None, description="Filtra por: tecnologia, climatizacion, energia, ingenieria_civil"), db: Session = Depends(get_db)):
    """
    Retorna los servicios del catálogo habilitados para e-commerce.
    contains_eager reutiliza el JOIN existente para cargar la relacion service.
    """
    from sqlalchemy.orm import contains_eager

    query = db.query(CatalogItem).join(
        Service, CatalogItem.service_id == Service.id
    ).options(
        contains_eager(CatalogItem.service)
    ).filter(
        CatalogItem.is_available == True,
        sa.or_(
            sa.and_(Service.marca.isnot(None), Service.marca != ''),
            sa.and_(Service.codigo_modelo.isnot(None), Service.codigo_modelo != ''),
        )
    )

    if pilar_id:
        query = query.filter(Service.pilar_id == pilar_id)

    return query.all()


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
