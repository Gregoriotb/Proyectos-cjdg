"""
[CONTEXT: SERVICE_OPERATIONS] - Invoices Router
Checkout: genera factura, descuenta stock. Admin gestiona estados.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

from database import get_db
from models.user import User
from models.invoice import Invoice, InvoiceItem, InvoiceTypeEnum, InvoiceStatusEnum
from models.cart import Cart, CartItem
from models.catalog import CatalogItem
from services.notifications import notify
from services.profile_validator import require_complete_profile
from services import stock_service, archive_service
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
    """Lista las facturas del usuario autenticado (no archivadas)."""
    return (
        db.query(Invoice)
        .filter(Invoice.user_id == current_user.id, Invoice.archivado_en.is_(None))
        .order_by(Invoice.created_at.desc())
        .all()
    )


@router.post("/checkout", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Convierte el carrito en factura. Descuenta stock automáticamente.
    Solo items con precio y stock disponible. Requiere perfil completo.
    """
    require_complete_profile(current_user)

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

        # Verificar stock disponible (físico - reservado)
        if stock_service.available(catalog_item) < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{service.nombre}'. Disponible: {stock_service.available(catalog_item)}, solicitado: {cart_item.quantity}"
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

    # Crear items de factura + reservar stock (no descontamos físico hasta que se pague)
    for item_data in invoice_items:
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            catalog_item_id=item_data["catalog_item_id"],
            descripcion=item_data["descripcion"],
            cantidad=item_data["cantidad"],
            precio_unitario=item_data["precio_unitario"],
            subtotal=item_data["subtotal"],
        )
        db.add(inv_item)

        # Reservar stock (incrementa stock_reservado, no toca stock físico)
        stock_service.reserve_stock(
            db,
            catalog_item_id=item_data["catalog_item_id"],
            quantity=item_data["cantidad"],
            reference_type="invoice",
            reference_id=str(invoice.id),
            user_id=current_user.id,
        )

    # Limpiar carrito
    for cart_item in cart.items:
        db.delete(cart_item)

    db.commit()
    db.refresh(invoice)

    # SC-NOTIF-01 + SC-WS-01: confirmar al cliente (DB + push WS)
    notify(
        db,
        user_id=current_user.id,
        type="invoice_created",
        title=f"Factura #{invoice.id} generada",
        message=f"Tu factura por ${total:.2f} fue creada exitosamente.",
        metadata={"invoice_id": invoice.id, "total": str(total)},
        background_tasks=background_tasks,
    )

    return invoice


# --- Admin ---
@router.get("/all", response_model=List[InvoiceResponse])
def get_all_invoices(
    user_id: Optional[str] = None,  # V2.3 — filtrar por cliente (para chat-cotizaciones)
    include_archived: bool = False,  # V2.4 — opt-in para ver archivadas en el endpoint vivo
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista TODAS las facturas del sistema (solo Admin). Filtrable por user_id."""
    query = db.query(Invoice)
    if not include_archived:
        query = query.filter(Invoice.archivado_en.is_(None))
    if user_id:
        query = query.filter(Invoice.user_id == user_id)
    return query.order_by(Invoice.created_at.desc()).all()


@router.put("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    data: InvoiceStatusUpdate,
    background_tasks: BackgroundTasks,
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

    # FEAT-Historial-v2.4: ajuste de stock por transición de status
    # PAID → confirm (descuenta físico, libera reserva)
    # CANCELLED / OVERDUE → release (libera reserva, no toca físico)
    prev_status = invoice.status
    is_transition_in = prev_status not in (InvoiceStatusEnum.PAID, InvoiceStatusEnum.CANCELLED, InvoiceStatusEnum.OVERDUE)
    confirm_states = {InvoiceStatusEnum.PAID}
    release_states = {InvoiceStatusEnum.CANCELLED, InvoiceStatusEnum.OVERDUE}

    if is_transition_in and (new_status in confirm_states or new_status in release_states):
        for inv_item in invoice.items:
            if not inv_item.catalog_item_id:
                continue
            try:
                if new_status in confirm_states:
                    stock_service.confirm_stock(
                        db,
                        catalog_item_id=inv_item.catalog_item_id,
                        quantity=inv_item.cantidad,
                        reference_type="invoice",
                        reference_id=str(invoice.id),
                        user_id=current_admin.id,
                        notes=f"status → {new_status.value}",
                    )
                else:
                    stock_service.release_stock(
                        db,
                        catalog_item_id=inv_item.catalog_item_id,
                        quantity=inv_item.cantidad,
                        reference_type="invoice",
                        reference_id=str(invoice.id),
                        user_id=current_admin.id,
                        notes=f"status → {new_status.value}",
                    )
            except HTTPException:
                # No bloquear el cambio de status si el stock_service falla
                pass

    old_status_label = invoice.status.value if invoice.status else "—"
    invoice.status = new_status
    if data.notas:
        invoice.notas = data.notas

    # FEAT-Historial-v2.4: si el status quedó terminal, archivar (idempotente)
    archive_service.auto_archive_invoice_if_terminal(db, invoice, archived_by=current_admin.id)

    db.commit()
    db.refresh(invoice)

    # SC-NOTIF-01 + SC-WS-01: notificar al cliente (DB + push WS)
    notify(
        db,
        user_id=invoice.user_id,
        type="invoice_status",
        title=f"Factura #{invoice.id}: {new_status.value}",
        message=f"Tu factura cambió de '{old_status_label}' a '{new_status.value}'.",
        metadata={
            "invoice_id": invoice.id,
            "old_status": old_status_label,
            "new_status": new_status.value,
        },
        background_tasks=background_tasks,
    )

    return {
        "message": "Estado actualizado",
        "invoice_id": invoice.id,
        "status": invoice.status.value,
    }
