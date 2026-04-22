"""
[CONTEXT: ADMIN_CONSOLE] - API Keys Service
SC-API-KEYS-01: Generación, verificación y tracking de uso.

Formato del raw key: "pcjdg_" + 32 hex chars → 128 bits de entropía.
Almacenado como SHA-256 hex (64 chars). Prefix (primeros 16 chars) guardado
en texto plano para UI.
"""
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from models.api_key import ApiKey


KEY_PREFIX_BRAND = "pcjdg_"
RAW_SUFFIX_LENGTH_BYTES = 16  # → 32 hex chars
DISPLAY_PREFIX_LENGTH = 16    # "pcjdg_" + 10 hex chars


def generate_api_key() -> tuple[str, str, str]:
    """Retorna (raw_key, display_prefix, key_hash)."""
    raw = KEY_PREFIX_BRAND + secrets.token_hex(RAW_SUFFIX_LENGTH_BYTES)
    display_prefix = raw[:DISPLAY_PREFIX_LENGTH]
    key_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, display_prefix, key_hash


def hash_raw_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def verify_api_key(raw_key: str, db: Session) -> Optional[ApiKey]:
    """Busca la key por hash. Retorna None si no existe, está inactiva o expiró."""
    if not raw_key or not raw_key.startswith(KEY_PREFIX_BRAND):
        return None

    key_hash = hash_raw_key(raw_key)
    ak = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
        .first()
    )
    if not ak:
        return None

    if ak.expires_at is not None:
        # Comparar en UTC. Si expires_at está sin tz, asumimos UTC.
        now = datetime.now(timezone.utc)
        expires = ak.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            return None

    return ak


def record_usage(ak: ApiKey, db: Session) -> None:
    """Incrementa usage_count y actualiza last_used_at. Best-effort."""
    try:
        ak.last_used_at = datetime.now(timezone.utc)
        ak.usage_count = (ak.usage_count or 0) + 1
        db.commit()
    except Exception:
        db.rollback()
