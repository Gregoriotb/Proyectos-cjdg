"""
============================================================
Proyectos CJDG — Backend Principal (FastAPI)
[CONTEXT: SYSTEM_CORE] — Punto de entrada de la aplicación
============================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Importación de routers (se activarán por subcontexto)
from routes import auth, catalog, cart, quotations, admin, admin_services, invoices, service_quotations

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
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

# ----------------------------------------------------------
# CORS — Permite que el Frontend consuma la API
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173", "http://localhost:80"],
    allow_origins=[
    "http://localhost",
    "http://127.0.0.1:5173",
    "http://localhost:5173"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# HEALTH CHECK — Verificación de estado del servicio
# ----------------------------------------------------------
@app.get("/api/v1/health", tags=["Sistema"])
def health_check():
    """Verifica que el backend está operativo."""
    return {
        "status": "ok",
        "service": "Proyectos CJDG API",
        "version": "1.0.0"
    }

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
