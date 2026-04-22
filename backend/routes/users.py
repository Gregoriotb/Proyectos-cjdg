"""
[CONTEXT: USER_GATEWAY] - Users Router (perfil del usuario autenticado)
SC-PROFILE-01: Endpoints para que el cliente edite su propio perfil fiscal.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user import ProfileUpdate, ProfileResponse, PasswordSetOrChange
from core.security import verify_password, get_password_hash
from dependencies import get_current_user
from routes.uploads import upload_file_to_imgbb

router = APIRouter()

# Tipos MIME aceptados para el archivo del RIF/Cédula
ALLOWED_RIF_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}

# Tipos MIME aceptados para foto de perfil (solo imágenes)
ALLOWED_PHOTO_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


@router.get("/profile", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Devuelve el perfil completo del usuario autenticado."""
    return current_user


@router.put("/profile", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza solo los campos provistos. RIF debe ser único globalmente.
    """
    data = payload.model_dump(exclude_unset=True)

    for key, value in data.items():
        setattr(current_user, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El RIF ya está registrado por otro usuario.",
        )

    db.refresh(current_user)
    return current_user


@router.post("/profile/rif-upload")
async def upload_rif_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Sube el archivo del RIF/Cédula (PDF o imagen). Devuelve URL pública.
    El frontend luego hace PUT /users/profile con rif_file_url=<url>.
    """
    if file.content_type not in ALLOWED_RIF_MIMES:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Sube PDF, JPG, PNG o WEBP.",
        )

    result = await upload_file_to_imgbb(file)
    return {
        "url": result["url"],
        "name": result.get("name"),
        "type": result.get("type"),
    }


@router.post("/profile/photo-upload")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Sube la foto de perfil (logo de empresa o avatar personal).
    Solo imágenes. Devuelve URL para guardar en profile_photo_url vía PUT /users/profile.
    """
    if file.content_type not in ALLOWED_PHOTO_MIMES:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Sube JPG, PNG, WEBP o GIF.",
        )

    result = await upload_file_to_imgbb(file)
    return {
        "url": result["url"],
        "name": result.get("name"),
        "type": result.get("type"),
    }


@router.post("/password")
def set_or_change_password(
    payload: PasswordSetOrChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint único para cambiar O establecer contraseña.

    - Si el usuario YA tiene password: requiere current_password válido.
    - Si el usuario NO tiene password (OAuth-only): current_password se ignora.
    """
    has_password = current_user.hashed_password is not None

    if has_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Debes ingresar tu contraseña actual.",
            )
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="La contraseña actual es incorrecta.",
            )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    return {
        "ok": True,
        "message": "Contraseña actualizada." if has_password else "Contraseña establecida.",
    }
