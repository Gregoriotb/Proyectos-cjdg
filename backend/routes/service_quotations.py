"""
[CONTEXT: SERVICE_OPERATIONS] - Service Quotations Router
SC-CLIENT-01: Cotizaciones de servicios corporativos (Brochure CJDG).
Flujo B: El cliente solicita cotización, el admin asigna precio y genera factura.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

from database import get_db
from models.user import User
from models.service_catalog import ServiceCatalog
from models.quotation import Quotation, QuotationStatusEnum
from models.invoice import Invoice, InvoiceItem, InvoiceTypeEnum, InvoiceStatusEnum
from schemas.quotation import QuotationResponse
from dependencies import get_current_user, get_current_admin

router = APIRouter()


class ServiceQuotationRequest(BaseModel):
    service_catalog_id: int
    descripcion_requerimiento: str
    notas_adicionales: Optional[str] = None


class ServiceQuotationPricing(BaseModel):
    precio_final: Decimal
    notas_admin: Optional[str] = None


@router.get("/corporate-services-public")
def list_active_corporate_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista servicios corporativos activos (para clientes autenticados)."""
    services = db.query(ServiceCatalog).filter(ServiceCatalog.activo == True).order_by(ServiceCatalog.pilar, ServiceCatalog.nombre).all()
    return [
        {
            "id": s.id,
            "pilar": s.pilar.value,
            "nombre": s.nombre,
            "descripcion": s.descripcion,
            "precio_base": float(s.precio_base) if s.precio_base else None,
            "activo": s.activo,
        }
        for s in services
    ]


@router.post("/service-quotation", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def request_service_quotation(
    data: ServiceQuotationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cliente solicita cotización de un servicio corporativo CJDG.
    No hay compra directa — el admin asignará precio desde su panel.
    """
    srv = db.query(ServiceCatalog).filter(ServiceCatalog.id == data.service_catalog_id, ServiceCatalog.activo == True).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio corporativo no encontrado o inactivo")

    notas = f"[SERVICIO: {srv.nombre} | PILAR: {srv.pilar.value}]\n{data.descripcion_requerimiento}"
    if data.notas_adicionales:
        notas += f"\n\nNotas adicionales: {data.notas_adicionales}"

    quotation = Quotation(
        user_id=current_user.id,
        notas_cliente=notas,
        status=QuotationStatusEnum.PENDING,
    )
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.get("/service-quotations", response_model=List[QuotationResponse])
def get_my_service_quotations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista las cotizaciones de servicios del usuario."""
    return db.query(Quotation).filter(
        Quotation.user_id == current_user.id,
        Quotation.notas_cliente.like("[SERVICIO:%")
    ).order_by(Quotation.created_at.desc()).all()


@router.post("/service-quotation/{quotation_id}/invoice")
def generate_invoice_from_quotation(
    quotation_id: int,
    pricing: ServiceQuotationPricing,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin asigna precio a una cotización de servicio y genera factura.
    """
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    # Extraer nombre del servicio de las notas
    service_name = "Servicio Corporativo CJDG"
    if quotation.notas_cliente and quotation.notas_cliente.startswith("[SERVICIO:"):
        try:
            service_name = quotation.notas_cliente.split("|")[0].replace("[SERVICIO:", "").strip()
        except Exception:
            pass

    # Crear factura
    invoice = Invoice(
        user_id=quotation.user_id,
        invoice_type=InvoiceTypeEnum.SERVICE_QUOTATION,
        status=InvoiceStatusEnum.PENDING,
        total=pricing.precio_final,
        notas=pricing.notas_admin,
        quotation_id=quotation.id,
    )
    db.add(invoice)
    db.flush()

    invoice_item = InvoiceItem(
        invoice_id=invoice.id,
        descripcion=service_name,
        cantidad=1,
        precio_unitario=pricing.precio_final,
        subtotal=pricing.precio_final,
    )
    db.add(invoice_item)

    # Actualizar estado de cotización
    quotation.status = QuotationStatusEnum.APPROVED

    db.commit()
    db.refresh(invoice)

    return {
        "message": "Factura generada exitosamente",
        "invoice_id": invoice.id,
        "total": float(invoice.total),
    }
