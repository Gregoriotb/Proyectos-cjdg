"""
[CONTEXT: SERVICE_OPERATIONS] - SQLAlchemy Model - Service
"""
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from database import Base

class Service(Base):
    """
    Representa un producto/servicio del catálogo real (Ancla de verdad).
    """
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    service_id = Column(String, unique=True, index=True, nullable=False)  # e.g. "CAT-CCTV-001"
    pilar_id = Column(String, index=True, nullable=False)                  # "tecnologia", "cableado"
    nombre = Column(String, nullable=False, index=True)
    categoria = Column(String, nullable=False, index=True)
    marca = Column(String, nullable=True)        # Hikvision, Ubiquiti, MikroTik…
    codigo_modelo = Column(String, nullable=True)  # DS-2CD2143G2-I
    description = Column(Text, nullable=True)
    specs = Column(JSONB, nullable=True)          # {"resolución": "4MP", "IR": "30m"…}
    image_url = Column(String, nullable=True)     # /static/products/cctv/DS-2CD2143.jpg (legado)
    image_urls = Column(JSONB, default=list, nullable=True) # Galería de imágenes (MercadoLibre)

