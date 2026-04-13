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
# SETUP — Endpoint temporal para inicializar DB en produccion
# Ejecutar UNA VEZ: POST /api/v1/setup?key=TU_SECRET_KEY
# ELIMINAR despues de usar
# ----------------------------------------------------------
@app.get("/api/v1/setup", tags=["Sistema"])
def setup_database(key: str):
    """Corre migraciones y crea admin. Protegido por SECRET_KEY."""
    import subprocess
    from core.security import get_password_hash

    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}

    results = []

    # 1. Correr migraciones con alembic
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True, text=True, timeout=30
        )
        results.append({
            "step": "migrations",
            "status": "ok" if result.returncode == 0 else "error",
            "output": result.stdout[-500:] if result.stdout else "",
            "error": result.stderr[-500:] if result.stderr else "",
        })
    except Exception as e:
        results.append({"step": "migrations", "status": "exception", "error": str(e)})

    # 2. Crear usuario admin
    try:
        from database import SessionLocal
        from models.user import User, UserRoleEnum
        db = SessionLocal()

        existing = db.query(User).filter(User.username == "jgregoriotbaltar").first()
        if existing:
            existing.role = UserRoleEnum.ADMIN
            existing.hashed_password = get_password_hash("1745694gregorio")
            db.commit()
            results.append({"step": "admin", "status": "updated"})
        else:
            admin = User(
                username="jgregoriotbaltar",
                email="jgregoriotbaltar@gmail.com",
                full_name="gregoriotb",
                hashed_password=get_password_hash("1745694gregorio"),
                role=UserRoleEnum.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            results.append({"step": "admin", "status": "created"})
        db.close()
    except Exception as e:
        results.append({"step": "admin", "status": "error", "error": str(e)})

    # 3. Seed de servicios desde brochure_knowledge.json
    try:
        from database import SessionLocal
        from models.service import Service
        from models.catalog import CatalogItem
        import json

        db = SessionLocal()
        brochure_path = os.path.join(os.path.dirname(__file__), "brochure_knowledge.json")

        with open(brochure_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        servicios_added = 0
        for pilar in data.get("pilares", []):
            pilar_id = pilar.get("id")
            for srv in pilar.get("servicios", []):
                existing = db.query(Service).filter(Service.service_id == srv["id"]).first()
                if not existing:
                    nuevo = Service(
                        service_id=srv["id"],
                        pilar_id=pilar_id,
                        nombre=srv["nombre"],
                        categoria=srv["categoria"],
                    )
                    db.add(nuevo)
                    servicios_added += 1
        db.commit()
        results.append({"step": "services_seed", "status": "ok", "added": servicios_added})

        # 4. Crear items de catalogo para cada servicio
        catalog_added = 0
        services = db.query(Service).all()
        for srv in services:
            item = db.query(CatalogItem).filter(CatalogItem.service_id == srv.id).first()
            if not item:
                new_item = CatalogItem(
                    service_id=srv.id,
                    price=0.00,
                    stock=50,
                    is_offer=False,
                )
                db.add(new_item)
                catalog_added += 1
        db.commit()
        results.append({"step": "catalog_seed", "status": "ok", "added": catalog_added})
        db.close()
    except Exception as e:
        results.append({"step": "seed", "status": "error", "error": str(e)})

    return {"results": results}

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
