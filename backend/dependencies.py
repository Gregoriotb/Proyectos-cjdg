"""
[CONTEXT: USER_GATEWAY] - AuthService Dependencies
Provee la lógica para recuperar y autorizar al usuario actual a partir del Bearer Token JWT.
SC-API-KEYS-01: agrega auth dual (JWT admin OR X-API-Key).
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from uuid import UUID

from database import get_db
from models.user import User
from core.security import SECRET_KEY, ALGORITHM

# Requerimiento del token Bearer en el header de las peticiones
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
        
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica si el usuario actual es un Administrador [ADMIN_CONSOLE]"""
    if current_user.role.value.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes"
        )
    return current_user


def get_admin_via_any_auth(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    [SC-API-KEYS-01] Acepta autenticación vía:
      1. Header `X-API-Key: pcjdg_...` (key activa, no expirada, dueño admin)
      2. Header `Authorization: Bearer <JWT>` con rol admin

    Si la API key es válida, registra uso (last_used_at, usage_count).
    """
    from services.api_keys import verify_api_key, record_usage

    # 1) Intento con X-API-Key
    api_key_raw = request.headers.get("x-api-key") or request.headers.get("X-API-Key")
    if api_key_raw:
        ak = verify_api_key(api_key_raw, db)
        if not ak:
            raise HTTPException(status_code=401, detail="API key inválida o expirada")

        user = db.query(User).filter(User.id == ak.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Usuario asociado a la key no válido")
        if user.role.value.lower() != "admin":
            raise HTTPException(status_code=403, detail="Permisos insuficientes")

        record_usage(ak, db)
        return user

    # 2) Fallback a JWT
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise HTTPException(status_code=401, detail="Token inválido")
            user_id = UUID(user_id_str)
        except (JWTError, ValueError):
            raise HTTPException(status_code=401, detail="Token inválido")

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Usuario inválido")
        if user.role.value.lower() != "admin":
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return user

    raise HTTPException(
        status_code=401,
        detail="Falta autenticación. Usa header 'X-API-Key' o 'Authorization: Bearer <token>'",
    )


def get_user_from_ws_token(token: str, db: Session) -> User | None:
    """
    [SC-WS-01] Valida un JWT venido de la query string del WebSocket.
    Retorna el User o None si el token es inválido. NO lanza HTTPException
    porque WebSocket usa close codes en vez de status HTTP.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None
    return user
