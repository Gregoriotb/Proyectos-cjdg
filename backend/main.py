"""
============================================================
Proyectos CJDG — Backend Principal (FastAPI)
[CONTEXT: SYSTEM_CORE] — Punto de entrada de la aplicación
SC-DEPLOY-002 — Adaptado para producción en Railway
============================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone
import logging
import os
import sys

# Importación de routers (se activarán por subcontexto)
from routes import auth, catalog, cart, quotations, admin, admin_services, invoices, service_quotations

# ----------------------------------------------------------
# LOGGING — Salida en stdout para Railway
# ----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cjdg")

# ----------------------------------------------------------
# ENTORNO — Detectar si estamos en producción
# ----------------------------------------------------------
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(
    title="Proyectos CJDG API",
    description="""
    ## Ecosistema Digital — Proyectos CJDG

    API REST para la gestión de servicios técnicos especializados
    en los 4 pilares: **Tecnología, Climatización, Energía e Ingeniería Civil**.

    ### Subcontextos
    - `/api/v1/auth` → [USER_GATEWAY]
    - `/api/v1/catalog` → [CATALOG]
    - `/api/v1/cart` → [CART]
    - `/api/v1/quotations` → [QUOTATIONS]
    - `/api/v1/admin` → [ADMIN_CONSOLE]
    """,
    version="1.0.0",
    docs_url="/api/v1/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/api/v1/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/api/v1/openapi.json" if ENVIRONMENT != "production" else None,
)

# ----------------------------------------------------------
# CORS — Dinámico: lee FRONTEND_URL de variable de entorno
# En dev: localhost:5173 | En prod: dominio Vercel
# ----------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost",
]
# Agregar dominio(s) de produccion desde la variable de entorno
for origin in FRONTEND_URL.split(","):
    origin = origin.strip()
    if origin and origin not in allowed_origins:
        allowed_origins.append(origin)

logger.info(f"CORS origins permitidos: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# HEALTH CHECK — Con timestamp ISO8601 para Railway
# ----------------------------------------------------------
@app.get("/api/v1/health", tags=["Sistema"])
def health_check():
    """Verifica que el backend esta operativo. Railway usa este endpoint."""
    return {
        "status": "ok",
        "service": "Proyectos CJDG API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": ENVIRONMENT,
    }

# ----------------------------------------------------------
# SETUP — Endpoints temporales para inicializar DB en produccion
# ELIMINAR despues de usar
# ----------------------------------------------------------
@app.get("/api/v1/setup", tags=["Sistema"])
def setup_database(key: str):
    """Paso 1: Migraciones + Admin + Brochure seed. Rapido."""
    import subprocess
    from core.security import get_password_hash
    from database import SessionLocal
    from models.user import User, UserRoleEnum
    from models.service import Service
    from models.catalog import CatalogItem
    import json

    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}

    results = []

    # 1. Migraciones
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True, text=True, timeout=60
        )
        results.append({
            "step": "migrations",
            "status": "ok" if result.returncode == 0 else "error",
            "output": result.stdout[-500:] if result.stdout else "",
            "error": result.stderr[-500:] if result.stderr else "",
        })
    except Exception as e:
        results.append({"step": "migrations", "error": str(e)})

    # 2. Admin
    try:
        db = SessionLocal()
        existing = db.query(User).filter(User.username == "jgregoriotbaltar").first()
        if existing:
            existing.role = UserRoleEnum.ADMIN
            existing.hashed_password = get_password_hash("1745694gregorio")
            db.commit()
            results.append({"step": "admin", "status": "updated"})
        else:
            db.add(User(
                username="jgregoriotbaltar",
                email="jgregoriotbaltar@gmail.com",
                full_name="gregoriotb",
                hashed_password=get_password_hash("1745694gregorio"),
                role=UserRoleEnum.ADMIN, is_active=True,
            ))
            db.commit()
            results.append({"step": "admin", "status": "created"})
        db.close()
    except Exception as e:
        results.append({"step": "admin", "error": str(e)})

    # 3. Brochure seed
    try:
        db = SessionLocal()
        brochure_path = os.path.join(os.path.dirname(__file__), "brochure_knowledge.json")
        with open(brochure_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        added = 0
        for pilar in data.get("pilares", []):
            for srv in pilar.get("servicios", []):
                if not db.query(Service).filter(Service.service_id == srv["id"]).first():
                    db.add(Service(service_id=srv["id"], pilar_id=pilar["id"],
                                   nombre=srv["nombre"], categoria=srv["categoria"]))
                    added += 1
        db.commit()

        # Catalog items para cada servicio sin item
        cat_added = 0
        for srv in db.query(Service).all():
            if not db.query(CatalogItem).filter(CatalogItem.service_id == srv.id).first():
                db.add(CatalogItem(service_id=srv.id, price=0.00, stock=50, is_offer=False))
                cat_added += 1
        db.commit()
        db.close()
        results.append({"step": "brochure_seed", "services": added, "catalog_items": cat_added})
    except Exception as e:
        results.append({"step": "brochure_seed", "error": str(e)})

    return {"results": results}


@app.get("/api/v1/setup-catalogs", tags=["Sistema"])
def setup_catalogs(key: str):
    """Paso 2: Ingestion de PDFs (puede tardar 30-60s). Correr DESPUES de /setup."""
    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}

    try:
        scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
        sys.path.insert(0, scripts_dir)
        # Importar fresh cada vez
        import importlib
        import ingest_catalogs
        importlib.reload(ingest_catalogs)
        ingest_catalogs.ingest()
        return {"status": "ok", "message": "PDF ingestion completed"}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()[-1000:]}

# ----------------------------------------------------------
# ARCHIVOS ESTÁTICOS — Imágenes de Productos
# ----------------------------------------------------------
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# ----------------------------------------------------------
# REGISTRO DE ROUTERS (se activarán en las fases siguientes)
# ----------------------------------------------------------
# Fase 3 — [CONTEXT: USER_GATEWAY]
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])

# Fase 4 — [CONTEXT: CATALOG]
app.include_router(catalog.router, prefix="/api/v1/catalog", tags=["Catálogo"])

# Fase 4 — [CONTEXT: CART]
app.include_router(cart.router, prefix="/api/v1/cart", tags=["Carrito"])

# Fase 4 — [CONTEXT: QUOTATIONS]
app.include_router(quotations.router, prefix="/api/v1/quotations", tags=["Cotizaciones"])

# Fase 4 — [CONTEXT: ADMIN_CONSOLE]
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Administrador"])

# SC-ADMIN-02 — [CONTEXT: ADMIN_CONSOLE] Servicios Corporativos
app.include_router(admin_services.router, prefix="/api/v1/admin", tags=["Servicios Corporativos"])

# SC-CLIENT-01 — [CONTEXT: SERVICE_OPERATIONS] Facturas
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Facturas"])

# SC-CLIENT-01 — [CONTEXT: SERVICE_OPERATIONS] Cotizaciones de Servicios
app.include_router(service_quotations.router, prefix="/api/v1", tags=["Cotizaciones de Servicios"])
