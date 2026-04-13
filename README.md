# Proyectos CJDG — Ecosistema Digital

> *"Cuatro disciplinas, Una sola solución"*

## Stack Técnico

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | React 18 · Vite · Tailwind CSS | **Vercel** |
| Backend | Python 3.11 · FastAPI · Uvicorn | **Railway** |
| Base de datos | PostgreSQL 15 (serverless) | **Neon** |
| Deploy local | Docker Compose + Nginx Gateway | Local dev |

---

## Arquitectura de Producción

```
Browser
  │
  ├── https://proyectos-cjdg.vercel.app (Frontend React)
  │     VITE_API_URL apunta directo a Railway
  │
  └── https://proyectos-cjdg-production.up.railway.app (Backend FastAPI)
        │   CORS: allow_origins=["*"]
        │   Dockerfile.prod (multi-stage, Python 3.11)
        │
        └── Neon PostgreSQL (serverless, sslmode=require)
```

### URLs de Producción

| Servicio | URL |
|---|---|
| Frontend (Vercel) | https://proyectos-cjdg.vercel.app |
| Backend (Railway) | https://proyectos-cjdg-production.up.railway.app |
| Health Check | https://proyectos-cjdg-production.up.railway.app/api/v1/health |
| Base de datos | Neon (ep-withered-forest-antvzmsq-pooler) |

---

## Desarrollo Local (Docker Compose)

### Requisitos
- Docker >= 24.0
- Docker Compose >= 2.0

### Arranque
```bash
docker-compose up --build
```

### Accesos locales
| Servicio | URL |
|---|---|
| Sitio web | http://localhost |
| API Docs (Swagger) | http://localhost/api/v1/docs |
| API ReDoc | http://localhost/api/v1/redoc |

---

## Los 2 Paneles

### Panel Admin (`/admin`)
- Gestión de catálogo de **productos físicos** (precio, stock, ofertas)
- Gestión de **servicios corporativos** CJDG (4 pilares del brochure)
- Recibir y procesar **cotizaciones entrantes**
- Generar **facturas** (PRODUCT_SALE y SERVICE_QUOTATION)
- Ajustes globales del e-commerce

### Panel Cliente (`/dashboard`)
- **Catálogo tipo Amazon** — productos con precios, stock, agregar al carrito
- **Browser de Servicios CJDG** — navegar los 4 pilares, solicitar cotización
- **Historial de cotizaciones** — ver estado de solicitudes
- **Facturas** — ver facturas generadas por el admin
- Carrito y checkout

### Flujos de Negocio
```
FLUJO A: PRODUCTOS FÍSICOS (2715 items de 13 catálogos PDF)
├── ProductCatalogGrid → cards con precio, stock
├── Carrito (CartContext) → persistente
├── Checkout → Genera Quotation
└── Admin revisa → Genera Invoice PRODUCT_SALE

FLUJO B: SERVICIOS CJDG (Brochure, 4 pilares)
├── ServiceBrowser → por Pilares, sin precio
├── Modal "Solicitar Cotización" → POST /service-quotation
├── Admin recibe en panel Cotizaciones
├── Admin asigna precio → POST /service-quotation/{id}/invoice
└── Invoice SERVICE_QUOTATION aparece en InvoiceList del cliente
```

---

## Los 4 Pilares

| Pilar | Servicios |
|---|---|
| Tecnología | Redes, CCTV, Control de Acceso, Servidores, Cableado |
| Climatización | Aires Acondicionados, Precisión, Ventilación |
| Energía | Plantas Eléctricas, Energía Solar |
| Ingeniería Civil | Construcción, Remodelaciones, Consultoría |

---

## Estructura del Proyecto

```
proyectos-cjdg/
├── docker-compose.yml          → Orquestación local (4 servicios)
├── railway.json                → Config Railway (Dockerfile builder)
├── gateway/                    → Nginx Reverse Proxy (solo local)
├── backend/
│   ├── Dockerfile.prod         → Build producción (multi-stage)
│   ├── railway.toml            → Config Railway
│   ├── main.py                 → FastAPI app + CORS + health + setup
│   ├── database.py             → SQLAlchemy + QueuePool (Neon compatible)
│   ├── models/                 → SQLAlchemy (User, Service, CatalogItem, etc.)
│   ├── schemas/                → Pydantic v2 (validación)
│   ├── routes/                 → Endpoints por subcontexto
│   ├── core/security.py        → JWT + bcrypt
│   ├── dependencies.py         → get_current_user, get_current_admin
│   ├── migrations/             → Alembic
│   ├── scripts/
│   │   ├── ingest_catalogs.py  → Extrae productos de PDFs
│   │   └── extract_to_json.py  → Genera catalog_data.json localmente
│   ├── catalog_data.json       → 2715 productos pre-extraídos de PDFs
│   ├── brochure_knowledge.json → Servicios base (Ancla de Verdad)
│   ├── seed.py                 → Seed servicios desde brochure
│   ├── seed_admin.py           → Seed usuario admin
│   └── seed_catalog.py         → Seed items de catálogo
├── frontend/
│   ├── vercel.json             → Config Vercel
│   ├── .env.production         → VITE_API_URL → Railway
│   ├── .env.development        → VITE_API_URL → localhost
│   ├── vite.config.ts          → Proxy dev + config
│   └── src/
│       ├── pages/              → Landing, Login, Register, Dashboard, Admin
│       ├── components/
│       │   ├── Admin/          → CatalogPanel, ServicesPanel, InvoicesPanel
│       │   └── Client/         → ProductCatalogGrid, ServiceBrowser, etc.
│       ├── services/api.ts     → Axios + interceptores JWT
│       └── context/            → AuthContext, CartContext
├── docs/
│   ├── sesion_admin_02.md
│   ├── sesion_client_01.md
│   └── sesion_security_01.md
└── fase despliegue/            → Prompts y guías de deploy
```

---

## Variables de Entorno

### Railway (Backend)
| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://...@neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | Clave para JWT |
| `FRONTEND_URL` | `https://proyectos-cjdg.vercel.app` |
| `ENVIRONMENT` | `production` |

### Vercel (Frontend)
| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://proyectos-cjdg-production.up.railway.app/api/v1` |

### Desarrollo Local (.env)
```env
DATABASE_URL=postgresql://cjdg_user:cjdg_password@db:5432/cjdg_db
SECRET_KEY=tu_clave_secreta
ENVIRONMENT=development
```

---

## Migraciones (Alembic)

```bash
# Local (dentro del contenedor)
docker-compose exec backend bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head

# Producción (endpoint temporal)
# GET /api/v1/setup?key=SECRET_KEY → corre migraciones + seed admin
```

---

## Carga de Catálogos en Producción

Los 2715 productos se extraen de 13 PDFs de catálogos (Hikvision, Ubiquiti, SIEMON, etc.):

```bash
# 1. Extraer datos localmente (requiere pdfplumber)
cd backend && python scripts/extract_to_json.py
# Genera catalog_data.json (664KB vs 54MB de PDFs)

# 2. Subir a Neon via endpoint temporal
# GET /api/v1/setup-catalogs?key=SECRET_KEY&batch=1
# batch=1..14 (200 productos por lote con bulk SQL INSERT)
```

---

## Notas Técnicas de Deploy

### Problema resuelto: 307 Redirect + Mixed Content
FastAPI redirige rutas `"/"` a `"/"` (trailing slash) con HTTP porque Railway
termina SSL antes del app. Solución: usar `""` en vez de `"/"` en los routers
montados con prefix, y `redirect_slashes=False` en el app.

### CORS
Se usa `allow_origins=["*"]` con `allow_credentials=False` porque la autenticación
es via Bearer token (header Authorization), no cookies. Esto evita problemas de
CORS inconsistente con Railway/Cloudflare.

### Base de datos Neon
- `QueuePool` con `pool_pre_ping=True` y `pool_recycle=300` para reconectar
  cuando Neon cierra conexiones idle.
- `joinedload` en queries de catálogo para evitar N+1 contra DB serverless.

### SSE (Stock en tiempo real)
Desactivado en producción cross-origin (EventSource no soporta headers CORS).
Funciona en desarrollo local con proxy Vite.
