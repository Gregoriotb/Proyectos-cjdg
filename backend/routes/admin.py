"""
[CONTEXT: ADMIN_CONSOLE] - Admin Router
Panel de control para administradores: Gestión de Leads e Ecommerce.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models.user import User
from models.quotation import Quotation
from models.ecommerce_settings import EcommerceSettings
from models.catalog import CatalogItem
from schemas.quotation import QuotationResponse
from schemas.ecommerce_settings import EcommerceSettingsResponse, EcommerceSettingsUpdate
from schemas.catalog import CatalogItemResponse, CatalogItemUpdate
from dependencies import get_current_admin

router = APIRouter()

@router.get("/leads", response_model=List[QuotationResponse])
def get_all_leads(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Obtiene todas las cotizaciones del sistema para que el administrador las revise.
    """
    return db.query(Quotation).all()

@router.get("/settings", response_model=EcommerceSettingsResponse)
def get_ecommerce_settings(db: Session = Depends(get_db)):
    """
    Obtiene la configuración global. (Público o protegido, depende de necesidad, 
    asumiremos que frontend la necesita pública para saber si mostrar precios).
    """
    settings = db.query(EcommerceSettings).first()
    if not settings:
        settings = EcommerceSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/settings", response_model=EcommerceSettingsResponse)
def update_ecommerce_settings(settings_in: EcommerceSettingsUpdate, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Actualiza configuraciones como habilitar/deshabilitar precios o catálogo entero.
    Solo para administradores.
    """
    settings = db.query(EcommerceSettings).first()
    if not settings:
        settings = EcommerceSettings()
        db.add(settings)
    
    if settings_in.is_catalog_visible is not None:
        settings.is_catalog_visible = settings_in.is_catalog_visible
    if settings_in.are_prices_visible is not None:
        settings.are_prices_visible = settings_in.are_prices_visible
    if settings_in.support_email is not None:
        settings.support_email = settings_in.support_email
    if settings_in.support_phone is not None:
        settings.support_phone = settings_in.support_phone
        
    db.commit()
    db.refresh(settings)
    return settings

@router.get("/inventory", response_model=List[CatalogItemResponse])
def get_inventory(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Lista todos los ítems del catálogo para gestión de inventario, 
    sin importar si están visibles o no.
    """
    return db.query(CatalogItem).all()

@router.put("/inventory/{item_id}", response_model=CatalogItemResponse)
def update_inventory_item(item_id: int, item_in: CatalogItemUpdate, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Modifica precio, stock y estado de oferta de un ítem.
    """
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de catálogo no encontrado")
        
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    db.commit()
    db.refresh(item)
    return item

# ─── Servicios ──────────────────────────────────────────────────────────────

from models.service import Service
from schemas.service import ServiceResponse

class ServiceUpdate(BaseModel):
    nombre: Optional[str] = None
    marca: Optional[str] = None
    codigo_modelo: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

@router.get("/services", response_model=List[ServiceResponse])
def get_all_services(
    pilar_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Lista todos los servicios/productos del catálogo para gestión admin."""
    query = db.query(Service)
    if pilar_id:
        query = query.filter(Service.pilar_id == pilar_id)
    if search:
        query = query.filter(Service.nombre.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()

@router.patch("/services/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    data: ServiceUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Actualiza los campos descriptivos de un servicio/producto."""
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(srv, field, value)
    db.commit()
    db.refresh(srv)
    return srv

