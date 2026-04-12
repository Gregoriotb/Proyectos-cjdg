"""
[CONTEXT: SERVICE_OPERATIONS] - SQLAlchemy Model - Catalog
"""
from sqlalchemy import Column, Integer, Boolean, Numeric, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class CatalogItem(Base):
    """
    Extensión del servicio para la capa de compra. 
    Aplica precio y visibilidad desde el Admin Console.
    """
    __tablename__ = "catalog_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, unique=True)
    price = Column(Numeric(10, 2), nullable=True) # Precio puede ser nulo si "A convenir"
    is_available = Column(Boolean, default=True)
    stock = Column(Integer, default=0, nullable=False)
    is_offer = Column(Boolean, default=False, nullable=False)
    discount_percentage = Column(Float, default=0.0, nullable=False)

    # Relación con Service
    service = relationship("Service")
