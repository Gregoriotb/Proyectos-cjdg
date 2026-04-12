"""
============================================================
Proyectos CJDG — Configuración de Base de Datos
[CONTEXT: SYSTEM_CORE] — Conexión PostgreSQL + SQLAlchemy
============================================================
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
import os

# ----------------------------------------------------------
# URL de conexión desde variable de entorno
# Formato: postgresql://user:password@host:port/database
# ----------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://cjdg_user:cjdg_password@db:5432/cjdg_db"
)

# ----------------------------------------------------------
# Motor de base de datos
# ----------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Recomendado para FastAPI con async
    echo=True           # Log de queries en desarrollo (False en producción)
)

# ----------------------------------------------------------
# Sesión de base de datos
# ----------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ----------------------------------------------------------
# Base declarativa para los modelos SQLAlchemy
# ----------------------------------------------------------
class Base(DeclarativeBase):
    pass

# ----------------------------------------------------------
# Dependency — Obtener sesión de DB por request (FastAPI)
# Uso: db: Session = Depends(get_db)
# ----------------------------------------------------------
def get_db():
    """Generador de sesión para inyección de dependencias en FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
