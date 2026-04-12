"""
[CONTEXT: SERVICE_OPERATIONS] - Quotations Router
Transforma un Carrito en una Cotización formal que el Admin puede revisar.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.cart import Cart
from models.quotation import Quotation, QuotationItem
from schemas.quotation import QuotationCreate, QuotationResponse
from dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(quotation_in: QuotationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Convierte el Carrito activo en una Cotización Formal.
    """
    cart = db.query(Cart).filter(Cart.id == quotation_in.cart_id, Cart.user_id == current_user.id).first()
    
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="El carrito no existe o está vacío")
        
    # Crear la nueva solicitud
    new_quotation = Quotation(
        user_id=current_user.id,
        notas_cliente=quotation_in.notas_cliente,
        status="pending"
    )
    db.add(new_quotation)
    db.flush() # Para obtener el ID
    
    # Mover items
    for item in cart.items:
        q_item = QuotationItem(
            quotation_id=new_quotation.id,
            catalog_item_id=item.catalog_item_id,
            quantity=item.quantity,
            observaciones=item.observaciones
        )
        db.add(q_item)
        
    # Limpiar carrito
    for item in cart.items:
        db.delete(item)
        
    db.commit()
    db.refresh(new_quotation)
    return new_quotation

@router.get("/", response_model=List[QuotationResponse])
def get_user_quotations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Obtiene el historial de cotizaciones (Leads) del usuario actual.
    """
    return db.query(Quotation).filter(Quotation.user_id == current_user.id).all()
