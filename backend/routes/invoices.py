"""
[CONTEXT: SERVICE_OPERATIONS] - Invoices Router
Checkout: genera factura, descuenta stock. Admin gestiona estados.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

from database import get_db
from models.user import User
from models.invoice import Invoice, InvoiceItem, InvoiceTypeEnum, InvoiceStatusEnum
from models.cart import Cart, CartItem
from models.catalog import CatalogItem
from models.service import Service
from schemas.invoice import InvoiceResponse
from dependencies import get_current_user, get_current_admin

router = APIRouter()


# --- Schemas ---
class CheckoutRequest(BaseModel):
    notas: Optional[str] = None


class InvoiceStatusUpdate(BaseModel):
    status: str  # PENDING, PAID, CANCELLED, OVERDUE, SHIPPED, DELIVERED
    notas: Optional[str] = None


# --- Cliente ---
@router.get("", response_model=List[InvoiceResponse])
def get_my_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista las facturas del usuario autenticado."""
    return db.query(Invoice).filter(Invoice.user_id == current_user.id).order_by(Invoice.created_at.desc()).all()


@router.post("/checkout", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Convierte el carrito en factura. Descuenta stock automáticamente.
    Solo items con precio y stock disponible.
    """
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    invoice_items = []
    total = Decimal("0.00")

    for cart_item in cart.items:
        catalog_item = db.query(CatalogItem).filter(CatalogItem.id == cart_item.catalog_item_id).first()
        if not catalog_item:
            continue

        service = db.query(Service).filter(Service.id == catalog_item.service_id).first()
        if not service:
            continue

        # Verificar stock
        if catalog_item.stock < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{service.nombre}'. Disponible: {catalog_item.stock}, solicitado: {cart_item.quantity}"
            )

        # Calcular precio con descuento si aplica
        unit_price = Decimal(str(catalog_item.price or 0))
        if catalog_item.is_offer and catalog_item.discount_percentage > 0:
            unit_price = unit_price * (1 - Decimal(str(catalog_item.discount_percentage)) / 100)

        subtotal = unit_price * cart_item.quantity
        total += subtotal

        invoice_items.append({
            "descripcion": f"{service.nombre}" + (f" ({service.codigo_modelo})" if service.codigo_modelo else ""),
            "cantidad": cart_item.quantity,
            "precio_unitario": unit_price,
            "subtotal": subtotal,
            "catalog_item_id": catalog_item.id,
        })

    if not invoice_items:
        raise HTTPException(status_code=400, detail="No hay items válidos en el carrito")

    # Crear factura
    invoice = Invoice(
        user_id=current_user.id,
        invoice_type=InvoiceTypeEnum.PRODUCT_SALE,
        status=InvoiceStatusEnum.PENDING,
        total=total,
        notas=data.notas,
    )
    db.add(invoice)
    db.flush()

    # Crear items de factura + descontar stock
    for item_data in invoice_items:
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            descripcion=item_data["descripcion"],
            cantidad=item_data["cantidad"],
            precio_unitario=item_data["precio_unitario"],
            subtotal=item_data["subtotal"],
        )
        db.add(inv_item)

        # Descontar stock
        catalog_item = db.query(CatalogItem).filter(CatalogItem.id == item_data["catalog_item_id"]).first()
        if catalog_item:
            catalog_item.stock -= item_data["cantidad"]

    # Limpiar carrito
    for cart_item in cart.items:
        db.delete(cart_item)

    db.commit()
    db.refresh(invoice)
    return invoice


# --- Admin ---
@router.get("/all", response_model=List[InvoiceResponse])
def get_all_invoices(
    user_id: Optional[str] = None,  # V2.3 — filtrar por cliente (para chat-cotizaciones)
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista TODAS las facturas del sistema (solo Admin). Filtrable por user_id."""
    query = db.query(Invoice)
    if user_id:
        query = query.filter(Invoice.user_id == user_id)
    return query.order_by(Invoice.created_at.desc()).all()


@router.put("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    data: InvoiceStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin actualiza estado de factura (pagado, enviado, entregado, cancelado)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    # Mapear string a enum
    status_map = {
        "PENDING": InvoiceStatusEnum.PENDING,
        "PAID": InvoiceStatusEnum.PAID,
        "CANCELLED": InvoiceStatusEnum.CANCELLED,
        "OVERDUE": InvoiceStatusEnum.OVERDUE,
    }

    new_status = status_map.get(data.status.upper())
    if not new_status:
        raise HTTPException(status_code=400, detail=f"Estado no válido: {data.status}")

    # Si se cancela, devolver stock
    if new_status == InvoiceStatusEnum.CANCELLED and invoice.status != InvoiceStatusEnum.CANCELLED:
        for inv_item in invoice.items:
            # Buscar catalog_item por descripción (ya que no guardamos el ID directo)
            service_name = inv_item.descripcion.split(" (")[0]
            service = db.query(Service).filter(Service.nombre == service_name).first()
            if service:
                catalog_item = db.query(CatalogItem).filter(CatalogItem.service_id == service.id).first()
                if catalog_item:
                    catalog_item.stock += inv_item.cantidad

    invoice.status = new_status
    if data.notas:
        invoice.notas = data.notas

    db.commit()
    db.refresh(invoice)

    return {
        "message": "Estado actualizado",
        "invoice_id": invoice.id,
        "status": invoice.status.value,
    }
