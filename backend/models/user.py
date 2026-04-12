"""
[CONTEXT: USER_GATEWAY] - SQLAlchemy Model - User
SC-SECURITY-01: username como login, campos OAuth preparados.
"""
import uuid
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
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
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.CLIENTE, nullable=False)
    is_active = Column(Boolean, default=True)

    # OAuth preparación (solo columnas, sin lógica aún)
    oauth_provider = Column(String(20), nullable=True, default=None)
    oauth_id = Column(String(255), nullable=True, default=None)
