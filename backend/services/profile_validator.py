"""
[CONTEXT: PROFILE] - Validación de perfil completo.

Antes de cotizar o facturar, el usuario debe tener su perfil completo.
Reglas:
  Todos:                full_name, email, phone, account_type
  account_type=Empresa: además company_name, rif, fiscal_address
  account_type=Particular: además rif (cédula)
"""
from typing import List

from fastapi import HTTPException, status

from models.user import User


COMMON_REQUIRED = ("full_name", "email", "phone", "account_type")
EMPRESA_EXTRA = ("company_name", "rif", "fiscal_address")
PARTICULAR_EXTRA = ("rif",)


def missing_profile_fields(user: User) -> List[str]:
    missing: List[str] = []
    for field in COMMON_REQUIRED:
        value = getattr(user, field, None)
        if not value or (isinstance(value, str) and not value.strip()):
            missing.append(field)

    account_type = (user.account_type or "").strip().lower()
    if account_type == "empresa":
        extras = EMPRESA_EXTRA
    elif account_type == "particular":
        extras = PARTICULAR_EXTRA
    else:
        return missing

    for field in extras:
        value = getattr(user, field, None)
        if not value or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return missing


def require_complete_profile(user: User) -> None:
    """Lanza HTTP 400 PROFILE_INCOMPLETE si al usuario le faltan campos."""
    missing = missing_profile_fields(user)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PROFILE_INCOMPLETE",
                "message": "Debes completar tu perfil antes de continuar.",
                "missing_fields": missing,
            },
        )
