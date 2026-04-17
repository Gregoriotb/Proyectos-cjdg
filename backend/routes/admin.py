"""
[CONTEXT: ADMIN_CONSOLE] - Admin Router
Panel de control para administradores: Gestión de Leads e Ecommerce.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models.user import User
from models.quotation import Quotation
from models.ecommerce_settings import EcommerceSettings
from models.catalog import CatalogItem
from models.service import Service
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

@router.get("/inventory")
def get_inventory(
    pilar_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_admin: User = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    """
    Lista todos los ítems del catálogo para gestión de inventario de forma paginada filtrada.
    """
    from sqlalchemy.orm import joinedload
    import sqlalchemy as sa
    
    query = db.query(CatalogItem).join(Service, CatalogItem.service_id == Service.id).options(joinedload(CatalogItem.service))
    
    # Solo productos reales (con marca o codigo de modelo) como hacia el frontend antes
    query = query.filter(sa.or_(Service.marca.isnot(None), Service.codigo_modelo.isnot(None)))
    
    if pilar_id:
        query = query.filter(Service.pilar_id == pilar_id)
        
    if search:
        term = f"%{search}%"
        query = query.filter(
            sa.or_(
                Service.nombre.ilike(term),
                Service.marca.ilike(term)
            )
        )
        
    total = query.count()
    skip = (page - 1) * page_size
    limit = page_size
    
    # Ordenar por ítems modificados (stock > 0 o precio > 0) y su respectivo ID
    items = query.order_by(
        sa.desc(sa.or_(CatalogItem.stock > 0, CatalogItem.price > 0)),
        CatalogItem.id
    ).offset(skip).limit(limit).all()
    
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
                "nombre": srv.nombre,
                "marca": srv.marca,
                "codigo_modelo": srv.codigo_modelo,
                "categoria": srv.categoria,
                "pilar_id": srv.pilar_id,
                "description": srv.description,
                "specs": srv.specs,
                "image_url": srv.image_url,
            } if srv else None,
        })
        
    return {"items": result, "total": total, "page": page, "page_size": page_size}

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

class InventoryItemCreate(BaseModel):
    nombre: str
    pilar_id: str
    categoria: str
    marca: Optional[str] = None
    codigo_modelo: Optional[str] = None
    description: Optional[str] = None
    specs: Optional[dict] = None
    image_url: Optional[str] = None
    image_urls: Optional[list[str]] = None
    price: Optional[float] = None
    stock: int = 0
    is_available: bool = True
    is_offer: bool = False
    discount_percentage: float = 0.0

@router.post("/inventory", response_model=CatalogItemResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryItemCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    import secrets
    new_srv = Service(
        service_id=f"auto-{secrets.token_hex(4)}",
        pilar_id=item_in.pilar_id,
        nombre=item_in.nombre,
        categoria=item_in.categoria,
        marca=item_in.marca,
        codigo_modelo=item_in.codigo_modelo,
        description=item_in.description,
        specs=item_in.specs,
        image_url=item_in.image_url,
        image_urls=item_in.image_urls
    )
    db.add(new_srv)
    db.commit()
    db.refresh(new_srv)
    
    new_cat = CatalogItem(
        service_id=new_srv.id,
        price=item_in.price,
        stock=item_in.stock,
        is_available=item_in.is_available,
        is_offer=item_in.is_offer,
        discount_percentage=item_in.discount_percentage
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    new_cat.service = new_srv
    return new_cat

@router.delete("/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de catálogo no encontrado")
        
    srv_id = item.service_id
    db.delete(item)
    srv = db.query(Service).filter(Service.id == srv_id).first()
    if srv:
        db.delete(srv)
    db.commit()
    return None

# ─── Servicios ──────────────────────────────────────────────────────────────

from models.service import Service
from schemas.service import ServiceResponse

class ServiceUpdate(BaseModel):
    nombre: Optional[str] = None
    marca: Optional[str] = None
    codigo_modelo: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[list[str]] = None

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

