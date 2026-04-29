"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Servicio de control de inventario con reserva/liberación/confirmación.

Modelo de stock en catalog_items:
  stock           = unidades físicas en almacén
  stock_reservado = unidades comprometidas (en facturas en proceso)
  disponible      = stock - stock_reservado

Ciclo de vida típico:
  Cliente hace checkout (factura PENDING)  → reserve_stock  (reservado +qty)
  Admin marca factura PAID / DELIVERED      → confirm_stock  (stock -qty, reservado -qty)
  Admin marca factura CANCELLED / OVERDUE   → release_stock  (reservado -qty)

Cada operación deja huella en stock_movements para auditoría.
"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.catalog import CatalogItem
from models.stock_movement import StockMovement


def _log(
    db: Session,
    catalog_item_id: int,
    movement_type: str,
    quantity: int,
    reference_type: Optional[str],
    reference_id: Optional[str],
    user_id: Optional[UUID],
    notes: Optional[str] = None,
) -> StockMovement:
    mv = StockMovement(
        catalog_item_id=catalog_item_id,
        movement_type=movement_type,
        quantity=quantity,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        user_id=user_id,
        notes=notes,
    )
    db.add(mv)
    return mv


def available(item: CatalogItem) -> int:
    """Stock realmente disponible para reservar."""
    return max(0, (item.stock or 0) - (item.stock_reservado or 0))


def reserve_stock(
    db: Session,
    catalog_item_id: int,
    quantity: int,
    *,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    notes: Optional[str] = None,
) -> CatalogItem:
    """
    Reserva `quantity` unidades. Lanza 400 si no hay disponible.
    NO descuenta stock físico — solo incrementa stock_reservado.
    """
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    item = db.query(CatalogItem).filter(CatalogItem.id == catalog_item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail=f"CatalogItem {catalog_item_id} no encontrado")
    if available(item) < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INSUFFICIENT_STOCK",
                "message": f"Stock insuficiente. Disponible: {available(item)}, solicitado: {quantity}",
                "catalog_item_id": catalog_item_id,
                "available": available(item),
            },
        )
    item.stock_reservado = (item.stock_reservado or 0) + quantity
    _log(db, catalog_item_id, "reserve", quantity, reference_type, reference_id, user_id, notes)
    return item


def release_stock(
    db: Session,
    catalog_item_id: int,
    quantity: int,
    *,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    notes: Optional[str] = None,
) -> CatalogItem:
    """
    Libera `quantity` unidades reservadas (vuelve al disponible).
    Usado cuando una factura se cancela o vence sin pagar.
    """
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    item = db.query(CatalogItem).filter(CatalogItem.id == catalog_item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail=f"CatalogItem {catalog_item_id} no encontrado")
    item.stock_reservado = max(0, (item.stock_reservado or 0) - quantity)
    _log(db, catalog_item_id, "release", -quantity, reference_type, reference_id, user_id, notes)
    return item


def confirm_stock(
    db: Session,
    catalog_item_id: int,
    quantity: int,
    *,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    notes: Optional[str] = None,
) -> CatalogItem:
    """
    Confirma la salida física: descuenta stock real y libera la reserva.
    Usado cuando una factura se marca como pagada / entregada.
    """
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    item = db.query(CatalogItem).filter(CatalogItem.id == catalog_item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail=f"CatalogItem {catalog_item_id} no encontrado")
    item.stock = max(0, (item.stock or 0) - quantity)
    item.stock_reservado = max(0, (item.stock_reservado or 0) - quantity)
    _log(db, catalog_item_id, "confirm", -quantity, reference_type, reference_id, user_id, notes)
    return item


def adjust_for_invoice_status(
    db: Session,
    invoice,
    new_status: str,
    *,
    actor_user_id: Optional[UUID] = None,
) -> None:
    """
    Aplica el cambio de stock correspondiente a una transición de status de factura.
    Llamado por admin al cambiar estado o por scheduler al marcar OVERDUE.

    Reglas:
      → PAID / DELIVERED / SHIPPED  : confirm (descuenta físico)
      → CANCELLED / OVERDUE         : release (libera reserva)
      → Otras                       : no-op
    """
    actions = {
        "PAID": "confirm",
        "DELIVERED": "confirm",
        "SHIPPED": "confirm",
        "CANCELLED": "release",
        "OVERDUE": "release",
    }
    action = actions.get(new_status.upper())
    if not action:
        return

    # Resolver catalog_item_id por descripción no es seguro — invoice items no llevan FK.
    # Por ahora, este helper solo documenta la intención. Si el invoice tiene metadata
    # con catalog_item_id (futuro), iterar y aplicar. Mientras tanto, los routes hacen el
    # ajuste explícitamente con los IDs que tienen disponibles al momento del cambio.
    return
