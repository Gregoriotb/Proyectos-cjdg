"""
[CONTEXT: SERVICE_OPERATIONS] - Cart Router
Gestiona el carrito dinámico del usuario (sesión de cotizaciones persistente).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.cart import Cart, CartItem
from schemas.cart import CartResponse, CartItemCreate
from dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=CartResponse)
def get_user_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retorna el carrito actual del usuario. Si no existe, lo crea.
    """
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

@router.post("/items", response_model=CartResponse)
def add_item_to_cart(item_in: CartItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Añade un servicio específico al carrito con cantidad y posibles observaciones.
    """
    cart = get_user_cart(current_user=current_user, db=db)
    
    # Check if item already exists in cart, update quantity
    existing_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.catalog_item_id == item_in.catalog_item_id).first()
    if existing_item:
        existing_item.quantity += item_in.quantity
        if item_in.observaciones:
            existing_item.observaciones = item_in.observaciones
    else:
        new_item = CartItem(
            cart_id=cart.id,
            catalog_item_id=item_in.catalog_item_id,
            quantity=item_in.quantity,
            observaciones=item_in.observaciones
        )
        db.add(new_item)
        
    db.commit()
    db.refresh(cart)
    return cart

@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_item_from_cart(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Elimina un ítem específico del carrito.
    """
    cart = get_user_cart(current_user=current_user, db=db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado en el carrito")
        
    db.delete(item)
    db.commit()
    db.refresh(cart)
    return cart
