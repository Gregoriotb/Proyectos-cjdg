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
def setup_catalogs(key: str, n: int = 0):
    """
    Ingestion de PDFs uno a uno para evitar timeout.
    n=0: lista los PDFs disponibles
    n=1..13: procesa ese PDF especifico
    """
    if key != os.getenv("SECRET_KEY", ""):
        return {"error": "unauthorized"}

    import re
    import pdfplumber
    from database import SessionLocal
    from models.service import Service
    from models.catalog import CatalogItem

    CATALOGS_BASE = os.path.join(os.path.dirname(__file__), "catalogs")
    CATALOG_MAP = {
        "CAT CCTV PR CJDG.pdf":                      ("seguridad",    "Cámaras CCTV",         "Hikvision"),
        "Cat UBIQUITI PrCJDG.pdf":                   ("redes",        "Redes Inalámbricas",    "Ubiquiti"),
        "CATALOGO PC CLONES PrCJDG.pdf":             ("tecnologia",   "PCs y Equipos",         "Varios"),
        "Lista Precios 4-03-26 PrCJDG.pdf":          ("tecnologia",   "Lista de Precios",      "Varios"),
        "Lista SIEMON Pr CJDG.pdf":                  ("cableado",     "Cableado Estructurado", "Siemon"),
        "Lista Fibra Optica PrCJDG.pdf":             ("cableado",     "Fibra Óptica",          "Varios"),
        "Lista Acceso-Alarma PrCJDG.pdf":            ("seguridad",    "Control de Acceso",     "Varios"),
        "Lista EZVIZ Pr CJDG.pdf":                   ("seguridad",    "Cámaras IP",            "EZVIZ"),
        "CATALOGO DE SERVIDORES NUEVOS PR CJDG.pdf": ("servidores",   "Servidores Nuevos",     "Varios"),
        "CATALOGO SERVIDORES RENOVADOS PR CJDG.pdf": ("servidores",   "Servidores Renovados",  "Varios"),
        "CAT HUAWEI PrCJDG.pdf":                     ("redes",        "Equipos Huawei",        "Huawei"),
        "Lista GRANDSTREAM PrCJDG.pdf":              ("comunicacion", "VoIP / PBX",            "Grandstream"),
        "Lista MIKROTIK PrCJDG.pdf":                 ("redes",        "Routers y Switches",    "MikroTik"),
    }

    def slugify(text):
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_-]+', '-', text)
        return text[:80]

    # Buscar todos los PDFs
    all_pdfs = []
    for root, dirs, files in os.walk(CATALOGS_BASE):
        for f in sorted(files):
            if f.lower().endswith('.pdf'):
                all_pdfs.append(os.path.join(root, f))
    all_pdfs.sort()

    # n=0: solo listar
    if n == 0:
        listing = []
        for i, p in enumerate(all_pdfs, 1):
            fname = os.path.basename(p)
            mapped = "si" if fname in CATALOG_MAP else "no"
            listing.append({"n": i, "file": fname, "mapped": mapped})
        return {"total_pdfs": len(all_pdfs), "pdfs": listing,
                "instrucciones": "Llama con n=1, n=2, ... hasta n=13 para procesar uno a uno"}

    # n=1..N: procesar ese PDF
    if n < 1 or n > len(all_pdfs):
        return {"error": f"n debe estar entre 1 y {len(all_pdfs)}"}

    pdf_path = all_pdfs[n - 1]
    filename = os.path.basename(pdf_path)
    mapping = CATALOG_MAP.get(filename)
    if mapping:
        pilar_id, categoria, marca = mapping
    else:
        pilar_id, categoria, marca = "general", filename.replace(".pdf", ""), "Varios"

    # Extraer productos del PDF
    products = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                for table in (page.extract_tables() or []):
                    if not table or len(table) < 2:
                        continue
                    headers = [str(h).strip().lower() if h else "" for h in table[0]]
                    for row in table[1:]:
                        if not row or all(not c or str(c).strip() == '' for c in row):
                            continue
                        row_data = [str(c).strip() if c else "" for c in row]
                        nombre, codigo, precio = "", "", None
                        for i, hdr in enumerate(headers):
                            if i >= len(row_data) or not row_data[i]:
                                continue
                            val = row_data[i]
                            if any(k in hdr for k in ['descripci', 'nombre', 'producto', 'modelo', 'item', 'detalle']):
                                nombre = nombre or val
                            if any(k in hdr for k in ['código', 'code', 'cod', 'ref', 'p/n']):
                                codigo = codigo or val
                            if any(k in hdr for k in ['precio', 'price', '$', 'pvp', 'costo', 'valor']):
                                cleaned = re.sub(r'[^\d.,]', '', val)
                                if cleaned:
                                    try:
                                        precio = float(cleaned.replace(',', '.'))
                                    except:
                                        pass
                        if not nombre and row_data:
                            nombre = row_data[0]
                        if nombre and len(nombre) > 2:
                            products.append({"nombre": nombre[:250], "codigo": codigo, "precio": precio})
    except Exception as e:
        return {"pdf": filename, "error": str(e)}

    # Insertar en DB
    db = SessionLocal()
    inserted = 0
    try:
        for i, prod in enumerate(products):
            sid = f"{slugify(pilar_id + '-' + prod['nombre'])}-{i+1}"
            if not db.query(Service).filter(Service.service_id == sid).first():
                nuevo = Service(
                    service_id=sid, pilar_id=pilar_id, nombre=prod["nombre"],
                    categoria=categoria, marca=marca, codigo_modelo=prod["codigo"] or None,
                )
                db.add(nuevo)
                db.flush()
                db.add(CatalogItem(
                    service_id=nuevo.id, price=prod["precio"], stock=0, is_available=True,
                ))
                inserted += 1
        db.commit()
    except Exception as e:
        db.rollback()
        return {"pdf": filename, "error": str(e)}
    finally:
        db.close()

    return {
        "pdf": filename, "pilar": pilar_id, "marca": marca,
        "products_found": len(products), "inserted": inserted,
        "next": f"Ahora llama con n={n+1}" if n < len(all_pdfs) else "Todos procesados!"
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
