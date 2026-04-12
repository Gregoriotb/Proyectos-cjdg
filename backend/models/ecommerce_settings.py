"""
[CONTEXT: ADMIN_CONSOLE] - SQLAlchemy Model - Ecommerce Settings
"""
from sqlalchemy import Column, Integer, Boolean, String
from database import Base

class EcommerceSettings(Base):
    """
    Configuraciones globales controladas por el administrador.
    Por ejemplo, ocultar todo el catálogo o esconder los precios.
    """
    __tablename__ = "ecommerce_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    is_catalog_visible = Column(Boolean, default=True)
    are_prices_visible = Column(Boolean, default=False)
    support_email = Column(String, default="admin@proyectoscjdg.com")
    support_phone = Column(String, nullable=True)
