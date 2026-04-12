"""
[CONTEXT: USER_GATEWAY] - Pydantic Schemas - User
SC-SECURITY-01: username obligatorio, OAuth preparación.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum
from typing import Optional
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
