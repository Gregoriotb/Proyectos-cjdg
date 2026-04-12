"""
[CONTEXT: ADMIN_CONSOLE] - SQLAlchemy Model - ServiceCatalog
SC-ADMIN-02: Servicios corporativos CJDG (Brochure) con precios gestionables.
Separado del catálogo de productos físicos (CatalogItem).
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, Enum, DateTime
from sqlalchemy.sql import func
from database import Base
import enum


class PilarEnum(enum.Enum):
    TECNOLOGIA = "TECNOLOGIA"
    CLIMATIZACION = "CLIMATIZACION"
    ENERGIA = "ENERGIA"
    CIVIL = "CIVIL"


class ServiceCatalog(Base):
    """
    Servicios corporativos del Brochure CJDG.
    NO son productos físicos — son servicios de ingeniería (instalación, mantenimiento, etc.)
    """
    __tablename__ = "service_catalog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pilar = Column(Enum(PilarEnum), nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio_base = Column(Numeric(12, 2), nullable=True)  # Null = requiere cotización manual
    precio_variable = Column(Boolean, default=True)       # Si True, admin puede cambiar en cotización
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
