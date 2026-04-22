"""
[CONTEXT: USER_GATEWAY] - SQLAlchemy Model - User
SC-SECURITY-01: username como login, campos OAuth preparados.
V2.1: Campos extendidos para chat-cotizaciones (first_name, last_name, phone, company_name, address).
"""
import uuid
from sqlalchemy import Column, String, Boolean, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRoleEnum(enum.Enum):
    ADMIN = "ADMIN"
    TECNICO = "TECNICO"
    CLIENTE = "CLIENTE"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable: usuarios OAuth no tienen password local
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.CLIENTE, nullable=False)
    is_active = Column(Boolean, default=True)

    # OAuth preparación (solo columnas, sin lógica aún)
    oauth_provider = Column(String(20), nullable=True, default=None)
    oauth_id = Column(String(255), nullable=True, default=None)

    # V2.1 — Campos extendidos para chat-cotizaciones
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(30), nullable=True)
    company_name = Column(String(255), nullable=True)

    # V2.5 — Perfil fiscal completo (renombrado address → fiscal_address)
    fiscal_address = Column(Text, nullable=True)
    rif = Column(String(50), nullable=True, unique=True, index=True)
    rif_file_url = Column(String(500), nullable=True)

    # V2.6 — Tipo de cuenta (empresa/particular) y foto de perfil
    # 'rif' guarda RIF si empresa, Cédula si particular (UI etiqueta condicional)
    account_type = Column(String(20), nullable=True)  # 'empresa' | 'particular'
    profile_photo_url = Column(String(500), nullable=True)

    quotation_threads = relationship(
        "QuotationThread",
        foreign_keys="QuotationThread.client_id",
        back_populates="client",
        cascade="all, delete-orphan",
    )
