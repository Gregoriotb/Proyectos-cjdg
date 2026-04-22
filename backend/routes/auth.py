"""
[CONTEXT: USER_GATEWAY] - Auth Router
SC-SECURITY-01: Login por username, registro con validaciones, endpoint /verify.
SC-AUTH-OAUTH: Login con Google vía authlib (flow authorization code).
"""
import re
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRoleEnum
from schemas.user import UserCreate, UserResponse, UsernameCheck
from core.security import verify_password, get_password_hash, create_access_token
from core.oauth import oauth, GOOGLE_REDIRECT_URI, FRONTEND_URL
from dependencies import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con username único.
    """
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Este nombre de usuario ya está en uso.")

    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado en el sistema.")

    user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/check-username")
def check_username_availability(data: UsernameCheck, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.username == data.username.lower()).first()
    return {"available": not exists}


@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Inicia sesión con username + password (OAuth2 form-data).
    """
    user = db.query(User).filter(User.username == form_data.username.lower()).first()

    # Usuario OAuth sin password local → no puede loguear por este flow
    if user and not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta usa inicio de sesión con Google. Continúa con el botón de Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name,
        "username": user.username,
    }


@router.get("/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    """
    Valida el token JWT contra el backend y retorna el perfil completo.
    El frontend llama a este endpoint en cada carga de ruta protegida y
    para refrescar el estado del usuario después de actualizar el perfil.
    """
    return {
        "valid": True,
        "id": str(current_user.id),
        "role": current_user.role.value,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "company_name": current_user.company_name,
        "fiscal_address": current_user.fiscal_address,
        "rif": current_user.rif,
        "rif_file_url": current_user.rif_file_url,
        "oauth_provider": current_user.oauth_provider,
    }


# ============================================================
# SC-AUTH-OAUTH — Google OAuth 2.0 (authorization code flow)
# ============================================================

def _generate_unique_username(db: Session, email: str) -> str:
    """Deriva un username único a partir del email. Dedup con sufijo numérico."""
    base = re.sub(r"[^a-z0-9_]", "", (email.split("@")[0] or "user").lower())[:40] or "user"
    if len(base) < 4:
        base = (base + "user")[:4]

    candidate = base
    suffix = 0
    while db.query(User).filter(User.username == candidate).first() is not None:
        suffix += 1
        candidate = f"{base}{suffix}"[:50]
    return candidate


def _redirect_to_frontend_with_token(access_token: str) -> RedirectResponse:
    """Redirige al frontend con el JWT en el URL fragment (no va al servidor, no queda en logs)."""
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback#token={access_token}")


def _redirect_to_frontend_with_error(error_code: str) -> RedirectResponse:
    return RedirectResponse(url=f"{FRONTEND_URL}/login?{urlencode({'oauth_error': error_code})}")


@router.get("/google/login")
async def google_login(request: Request):
    """Inicia el flow OAuth — redirige al consent de Google."""
    if not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="GOOGLE_REDIRECT_URI no configurado")
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Callback tras autorización de Google. Busca/crea usuario y redirige al frontend con JWT."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return _redirect_to_frontend_with_error("oauth_failed")

    userinfo = token.get("userinfo")
    if not userinfo:
        return _redirect_to_frontend_with_error("no_userinfo")

    google_sub = userinfo.get("sub")
    email = userinfo.get("email")
    email_verified = userinfo.get("email_verified", False)
    full_name = userinfo.get("name") or email

    if not google_sub or not email:
        return _redirect_to_frontend_with_error("missing_claims")

    if not email_verified:
        return _redirect_to_frontend_with_error("email_not_verified")

    # 1) Intentar match por (oauth_provider, oauth_id)
    user = (
        db.query(User)
        .filter(User.oauth_provider == "google", User.oauth_id == google_sub)
        .first()
    )

    # 2) Si no, intentar match por email (vincula cuenta existente a Google)
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_sub
            db.commit()
            db.refresh(user)

    # 3) Si no existe, crear nuevo usuario OAuth (sin password)
    if not user:
        username = _generate_unique_username(db, email)
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=None,
            role=UserRoleEnum.CLIENTE,
            is_active=True,
            oauth_provider="google",
            oauth_id=google_sub,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        return _redirect_to_frontend_with_error("user_inactive")

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    return _redirect_to_frontend_with_token(access_token)
