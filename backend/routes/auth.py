"""
[CONTEXT: USER_GATEWAY] - Auth Router
SC-SECURITY-01: Login por username, registro con validaciones, endpoint /verify.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserResponse, UsernameCheck
from core.security import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con username único.
    """
    # Verificar username único
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=400,
            detail="Este nombre de usuario ya está en uso."
        )

    # Verificar email único
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado en el sistema."
        )

    user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/check-username")
def check_username_availability(data: UsernameCheck, db: Session = Depends(get_db)):
    """
    Verifica en tiempo real si un username está disponible.
    """
    exists = db.query(User).filter(User.username == data.username.lower()).first()
    return {"available": not exists}


@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Inicia sesión con username + password (OAuth2 form-data).
    """
    user = db.query(User).filter(User.username == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name,
        "username": user.username
    }


@router.get("/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    """
    Valida el token JWT contra el backend.
    El frontend llama a este endpoint en cada carga de ruta protegida.
    """
    return {
        "valid": True,
        "role": current_user.role.value,
        "full_name": current_user.full_name,
        "username": current_user.username
    }


# Rutas OAuth preparadas (sin lógica aún)
@router.get("/google")
def oauth_google():
    """Placeholder para OAuth con Google. Sin implementación aún."""
    raise HTTPException(status_code=501, detail="OAuth con Google aún no implementado")


@router.get("/github")
def oauth_github():
    """Placeholder para OAuth con GitHub. Sin implementación aún."""
    raise HTTPException(status_code=501, detail="OAuth con GitHub aún no implementado")
