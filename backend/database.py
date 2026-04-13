"""
============================================================
Proyectos CJDG — Configuración de Base de Datos
[CONTEXT: SYSTEM_CORE] — Conexión PostgreSQL + SQLAlchemy
SC-DEPLOY-002 — Compatible con Neon (serverless pooling)
============================================================
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool
import logging
import os

logger = logging.getLogger("cjdg.database")

# ----------------------------------------------------------
# URL de conexión desde variable de entorno
# Neon requiere sslmode=require en la URL
# Local: postgresql://cjdg_user:cjdg_password@db:5432/cjdg_db
# Neon:  postgresql://user:pass@host/db?sslmode=require
# ----------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://cjdg_user:cjdg_password@db:5432/cjdg_db"
)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ----------------------------------------------------------
# Motor de base de datos
# Produccion: pool de conexiones para Neon serverless
# Desarrollo: echo=True para ver queries
# ----------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,            # Conexiones base (Neon free tier soporta ~20)
    max_overflow=10,        # Conexiones extra bajo carga
    pool_pre_ping=True,     # Reconectar si Neon cierra la conexion idle
    pool_recycle=300,       # Reciclar conexiones cada 5 min (Neon las cierra)
    echo=(ENVIRONMENT == "development"),
)

logger.info(f"Database conectada [{ENVIRONMENT}]")

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
