"""
[CONTEXT: USER_GATEWAY] - Pydantic Schemas - User
SC-SECURITY-01: username obligatorio, OAuth preparación.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum
from typing import Optional, Literal
from uuid import UUID
import re


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    TECNICO = "TECNICO"
    CLIENTE = "CLIENTE"


class UserBase(BaseModel):
    username: str = Field(..., min_length=4, max_length=50, description="Usuario único para login")
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CLIENTE
    is_active: bool = True

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos")
        return v.lower()


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Contraseña del usuario")
    confirm_password: str = Field(..., min_length=6, description="Confirmación de contraseña")

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Las contraseñas no coinciden")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# V2.5/V2.6 — Perfil editable por el propio usuario
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    company_name: Optional[str] = Field(None, max_length=255)
    fiscal_address: Optional[str] = Field(None, max_length=2000)
    rif: Optional[str] = Field(None, max_length=50)
    rif_file_url: Optional[str] = Field(None, max_length=500)
    account_type: Optional[Literal["empresa", "particular"]] = None
    profile_photo_url: Optional[str] = Field(None, max_length=500)

    @field_validator("rif")
    @classmethod
    def validate_tax_id_format(cls, v: Optional[str]) -> Optional[str]:
        """Acepta tanto RIF (J-12345678-9) como Cédula (V-12345678).
        La UI etiqueta condicionalmente y aplica validación estricta por tipo.
        Backend permite ambos formatos para soportar empresa/particular."""
        if v is None or v == "":
            return None
        v = v.strip().upper().replace(" ", "")
        # Formato amplio: letra(VEJGPC) + 6-9 dígitos + opcional verificador
        if not re.match(r'^[VEJGPC]-?\d{6,9}-?\d?$', v):
            raise ValueError(
                "Formato inválido. RIF: J-12345678-9 · Cédula: V-12345678"
            )
        return v


class PasswordSetOrChange(BaseModel):
    """Endpoint único: si el usuario no tiene password (OAuth-only), current_password es ignorado."""
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Las contraseñas no coinciden")
        return v


class ProfileResponse(BaseModel):
    """Respuesta de /auth/verify y /users/profile — incluye todos los campos editables."""
    id: UUID
    username: str
    email: EmailStr
    role: UserRole
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    fiscal_address: Optional[str] = None
    rif: Optional[str] = None
    rif_file_url: Optional[str] = None
    account_type: Optional[str] = None
    profile_photo_url: Optional[str] = None
    oauth_provider: Optional[str] = None
    has_password: bool = False  # True si hashed_password no es NULL

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    id: UUID

    class Config:
        from_attributes = True


class UsernameCheck(BaseModel):
    username: str = Field(..., min_length=4, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos")
        return v.lower()
