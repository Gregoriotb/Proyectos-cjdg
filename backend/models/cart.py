"""
[CONTEXT: SERVICE_OPERATIONS] - SQLAlchemy Model - Cart
"""
from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    observaciones = Column(String, nullable=True)

    cart = relationship("Cart", back_populates="items")
    catalog_item = relationship("CatalogItem")
