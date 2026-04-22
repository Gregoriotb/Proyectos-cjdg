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
from starlette.middleware.sessions import SessionMiddleware
from datetime import datetime, timezone
import logging
import os
import sys

# Importación de routers (se activarán por subcontexto)
from routes import auth, catalog, cart, quotations, admin, admin_services, admin_export, invoices, service_quotations, chat_quotation

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
    redirect_slashes=False,
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
# SESSION — Requerido por authlib (OAuth state/CSRF). Cookie corta, solo para el handshake.
# ----------------------------------------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION_VERY_LONG_STRING"),
    same_site="lax",
    https_only=ENVIRONMENT == "production",
    max_age=600,
)

# ----------------------------------------------------------
# CORS — Wildcard para produccion (usamos Bearer tokens, no cookies)
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
def setup_catalogs(key: str, batch: int = 0):
    """
    Carga catalog_data.json en Neon por lotes de 200 productos.
    batch=0: muestra cuantos lotes hay
    batch=1,2,3...: carga ese lote (200 productos cada uno)
    """
    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}

    import json as json_lib
    from sqlalchemy import text
    from database import SessionLocal

    json_path = os.path.join(os.path.dirname(__file__), "catalog_data.json")
    if not os.path.exists(json_path):
        return {"error": "catalog_data.json no encontrado"}

    with open(json_path, "r", encoding="utf-8") as f:
        products = json_lib.load(f)

    BATCH_SIZE = 200
    total_batches = (len(products) + BATCH_SIZE - 1) // BATCH_SIZE

    if batch == 0:
        return {
            "total_products": len(products),
            "batch_size": BATCH_SIZE,
            "total_batches": total_batches,
            "instrucciones": "Llama con batch=1, batch=2, ... hasta batch=" + str(total_batches),
        }

    if batch < 1 or batch > total_batches:
        return {"error": f"batch debe ser entre 1 y {total_batches}"}

    # Tomar solo este lote
    start = (batch - 1) * BATCH_SIZE
    end = min(start + BATCH_SIZE, len(products))
    batch_products = products[start:end]

    db = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        # 1 solo SELECT: obtener todos los service_id existentes de este lote
        sids = [p["service_id"] for p in batch_products]
        result = db.execute(
            text("SELECT service_id FROM services WHERE service_id = ANY(:sids)"),
            {"sids": sids}
        )
        existing_sids = {row[0] for row in result}

        # Filtrar nuevos
        new_products = [p for p in batch_products if p["service_id"] not in existing_sids]
        skipped = len(batch_products) - len(new_products)

        if new_products:
            # Bulk INSERT services con raw SQL (1 query para todos)
            service_values = []
            for p in new_products:
                service_values.append({
                    "service_id": p["service_id"],
                    "pilar_id": p["pilar_id"],
                    "nombre": p["nombre"],
                    "categoria": p["categoria"],
                    "marca": p.get("marca"),
                    "codigo_modelo": p.get("codigo_modelo"),
                })

            db.execute(
                text("""
                    INSERT INTO services (service_id, pilar_id, nombre, categoria, marca, codigo_modelo)
                    VALUES (:service_id, :pilar_id, :nombre, :categoria, :marca, :codigo_modelo)
                    ON CONFLICT (service_id) DO NOTHING
                """),
                service_values
            )
            db.commit()

            # Obtener IDs de los services recien insertados (1 query)
            result = db.execute(
                text("SELECT id, service_id FROM services WHERE service_id = ANY(:sids)"),
                {"sids": [p["service_id"] for p in new_products]}
            )
            id_map = {row[1]: row[0] for row in result}

            # Bulk INSERT catalog items (1 query)
            catalog_values = []
            for p in new_products:
                srv_id = id_map.get(p["service_id"])
                if srv_id:
                    catalog_values.append({
                        "service_id": srv_id,
                        "price": p.get("precio"),
                        "stock": 0,
                        "is_available": True,
                        "is_offer": False,
                        "discount_percentage": 0.0,
                    })

            if catalog_values:
                db.execute(
                    text("""
                        INSERT INTO catalog_items (service_id, price, stock, is_available, is_offer, discount_percentage)
                        VALUES (:service_id, :price, :stock, :is_available, :is_offer, :discount_percentage)
                        ON CONFLICT DO NOTHING
                    """),
                    catalog_values
                )
            db.commit()
            inserted = len(new_products)

    except Exception as e:
        db.rollback()
        import traceback
        return {"batch": batch, "error": str(e), "trace": traceback.format_exc()[-500:]}
    finally:
        db.close()

    return {
        "batch": batch,
        "range": f"{start+1}-{end}",
        "inserted": inserted,
        "skipped": skipped,
        "next": f"batch={batch+1}" if batch < total_batches else "Todos cargados!",
    }


@app.get("/api/v1/setup-fix-pilares", tags=["Sistema"])
def fix_pilares(key: str):
    """Mapea todos los pilar_id de productos PDF a 'tecnologia'."""
    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}
    from sqlalchemy import text
    from database import SessionLocal
    db = SessionLocal()
    try:
        result = db.execute(text("""
            UPDATE services SET pilar_id = 'tecnologia'
            WHERE pilar_id IN ('seguridad','redes','cableado','servidores','comunicacion','general')
        """))
        db.commit()
        return {"updated": result.rowcount}
    finally:
        db.close()

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

# SC-ADMIN-EXPORT-01 — Export unificado (reportes/backups)
app.include_router(admin_export.router, prefix="/api/v1/admin", tags=["Admin Export"])

# SC-API-KEYS-01 — Gestión de API Keys (admin)
from routes import api_keys as api_keys_routes
app.include_router(api_keys_routes.router, prefix="/api/v1/admin", tags=["API Keys"])

# SC-CLIENT-01 — [CONTEXT: SERVICE_OPERATIONS] Facturas
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Facturas"])

# SC-CLIENT-01 — [CONTEXT: SERVICE_OPERATIONS] Cotizaciones de Servicios
app.include_router(service_quotations.router, prefix="/api/v1", tags=["Cotizaciones de Servicios"])

# Fase Extras — [CONTEXT: UPLOADS] Subida de Archivos
from routes import uploads
app.include_router(uploads.router, prefix="/api/v1", tags=["Archivos e Imágenes"])

# V2.1 — [CONTEXT: CHAT_QUOTATIONS] Chat-Cotizaciones con hilos y adjuntos
app.include_router(chat_quotation.router, prefix="/api/v1", tags=["Chat Cotizaciones"])

# V2.5 — [CONTEXT: USER_GATEWAY] Perfil del cliente (RIF, dirección fiscal)
from routes import users as users_routes
app.include_router(users_routes.router, prefix="/api/v1/users", tags=["Perfil de Usuario"])

# V2.7 — [CONTEXT: NOTIFICATIONS] Inbox de notificaciones in-app por usuario
from routes import notifications as notifications_routes
app.include_router(notifications_routes.router, prefix="/api/v1/notifications", tags=["Notificaciones"])

# V2.8 — [CONTEXT: REALTIME] WebSocket único por usuario (notificaciones + chat en tiempo real)
from routes import ws as ws_routes
app.include_router(ws_routes.router, prefix="/api/v1", tags=["WebSocket"])
