"""
[CONTEXT: ADMIN_CONSOLE] - Admin Services Router
SC-ADMIN-02: CRUD de servicios corporativos CJDG (Brochure).
Separado del catálogo de productos físicos.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models.user import User
from models.service_catalog import ServiceCatalog, PilarEnum
from schemas.service_catalog import (
    ServiceCatalogCreate,
    ServiceCatalogUpdate,
    ServiceCatalogResponse,
    PilarType,
)
from dependencies import get_current_admin

router = APIRouter()


@router.get("/corporate-services", response_model=List[ServiceCatalogResponse])
def list_corporate_services(
    pilar: Optional[PilarType] = None,
    activo: Optional[bool] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista todos los servicios corporativos, con filtro opcional por pilar y estado."""
    query = db.query(ServiceCatalog)
    if pilar:
        query = query.filter(ServiceCatalog.pilar == PilarEnum(pilar.value))
    if activo is not None:
        query = query.filter(ServiceCatalog.activo == activo)
    return query.order_by(ServiceCatalog.pilar, ServiceCatalog.nombre).all()


@router.post("/corporate-services", response_model=ServiceCatalogResponse, status_code=status.HTTP_201_CREATED)
def create_corporate_service(
    data: ServiceCatalogCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Crea un nuevo servicio corporativo."""
    srv = ServiceCatalog(
        pilar=PilarEnum(data.pilar.value),
        nombre=data.nombre,
        descripcion=data.descripcion,
        precio_base=data.precio_base,
        precio_variable=data.precio_variable,
        activo=data.activo,
    )
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return srv


@router.put("/corporate-services/{service_id}", response_model=ServiceCatalogResponse)
def update_corporate_service(
    service_id: int,
    data: ServiceCatalogUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Actualiza un servicio corporativo existente (precio, estado, descripción, etc.)."""
    srv = db.query(ServiceCatalog).filter(ServiceCatalog.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio corporativo no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(srv, field, value)

    db.commit()
    db.refresh(srv)
    return srv


@router.delete("/corporate-services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_corporate_service(
    service_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Elimina un servicio corporativo."""
    srv = db.query(ServiceCatalog).filter(ServiceCatalog.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio corporativo no encontrado")

    db.delete(srv)
    db.commit()
