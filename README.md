# Proyectos CJDG — Ecosistema Digital

> *"Cuatro disciplinas, Una sola solución"*

Plataforma digital de **Proyectos CJDG** (Venezuela) — empresa de servicios técnicos corporativos organizados en 4 pilares: **Tecnología, Climatización, Energía e Ingeniería Civil**. Incluye catálogo de productos físicos con checkout tipo e-commerce, browser de servicios corporativos y **sistema de chat-cotizaciones con adjuntos** para negociar cotizaciones personalizadas en tiempo real con el admin.

---

## Stack Técnico

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS | **Vercel** |
| Backend | Python 3.11 · FastAPI · Uvicorn · SQLAlchemy 2 · Alembic | **Railway** (región `us-west`) |
| Base de datos | PostgreSQL (serverless) | **Neon** (branch `production`) |
| Archivos / Adjuntos | ImgBB API (CDN externo, fallback local) | — |
| Auth | JWT Bearer tokens + bcrypt | — |
| Deploy local | Docker Compose + Nginx Gateway | Local dev |

### URLs de Producción

| Servicio | URL |
|---|---|
| Frontend | <https://proyectos-cjdg.vercel.app> |
| Backend API | <https://proyectos-cjdg-production.up.railway.app/api/v1> |
| Health Check | <https://proyectos-cjdg-production.up.railway.app/api/v1/health> |
| Neon Console | `console.neon.tech/app/projects/purple-tree-14242206` |

---

## Arquitectura de Producción

```
Browser
  │
  ├── https://proyectos-cjdg.vercel.app (Frontend React/Vite)
  │     VITE_API_URL → Railway directamente
  │     axios `api` instance con JWT auto-inyectado (services/api.ts)
  │
  ├── https://proyectos-cjdg-production.up.railway.app (FastAPI)
  │     CORS: allow_origins=["*"]
  │     Dockerfile.prod multi-stage (Python 3.11-slim)
  │     Uvicorn --workers 2
  │
  ├── Neon PostgreSQL (sslmode=require)
  │     QueuePool con pool_pre_ping, pool_recycle=300s
  │
  └── ImgBB API
        Upload de adjuntos de chat e imágenes de catálogo
```

---

## Versión Actual: V2.1 Chat-Cotizaciones (Apr 2026)

La versión actual reemplaza el viejo flujo de "service_quotations" (tabla muerta de leads) con un sistema de **hilos de conversación persistentes** entre cliente y admin, con **adjuntos de archivos/imágenes**.

### Features clave V2.1
- **Hilos persistentes** (`quotation_threads`): cada solicitud de cotización es una conversación con estado (`pending`, `active`, `quoted`, `negotiating`, `closed`, `cancelled`).
- **Mensajes con adjuntos** (`chat_messages`): texto, imágenes (inline preview), PDFs y otros documentos (subidos a ImgBB, URL guardada).
- **Contadores de no leídos** por lado (cliente / admin) + polling de 8-10s.
- **Mensajes de sistema automáticos** al cambiar estado del hilo.
- **Hero premium** para el servicio destacado (badge dorado, gradiente animado, sparkles).
- **User profile extendido**: `first_name`, `last_name`, `phone`, `company_name`, `address` para mostrar contexto al admin.

### Endpoints V2.1 (`/api/v1/chat-quotations/*`)

```
# Cliente
POST   /chat-quotations/threads                          # Crear hilo
GET    /chat-quotations/my-threads                       # Listar mis hilos
GET    /chat-quotations/threads/{id}                     # Ver hilo + mensajes
POST   /chat-quotations/threads/{id}/messages            # Enviar mensaje
POST   /chat-quotations/threads/{id}/attachments         # Subir adjunto

# Admin
GET    /chat-quotations/admin/threads                    # Listar todos
GET    /chat-quotations/admin/threads/{id}               # Ver + client info
POST   /chat-quotations/admin/threads/{id}/messages      # Responder
POST   /chat-quotations/admin/threads/{id}/attachments   # Adjuntar
PATCH  /chat-quotations/admin/threads/{id}/status        # Cambiar estado
```

---

## Los 2 Paneles

### Panel Admin (`/admin`)
- **Cotizaciones Entrantes** → Chat-cotizaciones con drill-in al hilo
- **Catálogo** → Gestión de productos físicos (precio, stock, ofertas, imágenes)
- **Servicios** → CRUD de servicios corporativos del Brochure CJDG
- **Facturación** → Invoices (`PRODUCT_SALE` y `SERVICE_QUOTATION`)
- **Ajustes Globales** → Toggles de e-commerce

### Panel Cliente (`/dashboard`)
- **Catálogo** → Productos con checkout tipo Amazon
- **Mi Carrito** → Persistente
- **Servicios CJDG** → Browser por pilares + hero del servicio especial
- **Cotizaciones** → Lista de hilos + vista de chat con adjuntos
- **Facturas** → Historial de compras y cotizaciones pagadas
- **Mi Perfil**

---

## Flujos de Negocio

### FLUJO A — Productos Físicos
```
Catalog (2715 items, 13 PDFs)
  → ProductCatalogGrid → add to cart
  → CartContext (persistente)
  → Checkout → POST /invoices/checkout
  → Invoice PRODUCT_SALE generado
```

### FLUJO B — Servicios CJDG con Chat-Cotización (V2.1)
```
ServiceBrowser (4 pilares + hero especial)
  → Modal Cotizar (requerimiento + presupuesto opcional)
  → POST /chat-quotations/threads
  → Hilo creado + mensaje de sistema + mensaje inicial del cliente
  
Cliente "Cotizaciones"            Admin "Cotizaciones Entrantes"
  ClientQuotationsList              QuotationsPanel
  → drill-in                        → drill-in
  ClientChatView                    AdminChatPanel (con sidebar del cliente)
  ↔ mensajes en tiempo real (polling 8-10s) con adjuntos ↔
  
Admin cambia estado → quoted → negotiating → closed
  → Si se aprueba: Admin genera Invoice SERVICE_QUOTATION desde el panel
```

---

## Los 4 Pilares (Brochure)

| Pilar | Ejemplos de servicios |
|---|---|
| **Tecnología** | Redes, CCTV, Control de Acceso, Servidores, Cableado |
| **Climatización** | Aires acondicionados, Precisión, Ventilación |
| **Energía** | Plantas eléctricas, Energía solar |
| **Ingeniería Civil** | Construcción, Remodelaciones, Reforzamiento estructural |

---

## Estructura del Proyecto

```
proyectos-cjdg/
├── docker-compose.yml            Orquestación local (4 servicios)
├── railway.json                  Config Railway (Dockerfile builder)
├── gateway/                      Nginx Reverse Proxy (solo local)
│
├── backend/
│   ├── Dockerfile.prod           Build multi-stage Python 3.11
│   ├── railway.toml              Config Railway backend
│   ├── main.py                   FastAPI app + CORS + routers + setup endpoints
│   ├── database.py               SQLAlchemy engine + QueuePool (Neon-compatible)
│   ├── dependencies.py           get_current_user, get_current_admin
│   │
│   ├── models/                   SQLAlchemy ORM
│   │   ├── user.py               User + first_name/last_name/phone/company/address
│   │   ├── service.py            Service (brochure)
│   │   ├── service_catalog.py    ServiceCatalog (CRUD de admin)
│   │   ├── catalog.py            CatalogItem (productos físicos)
│   │   ├── cart.py, quotation.py, invoice.py
│   │   └── chat_quotation.py     V2.1: QuotationThread + ChatMessage
│   │
│   ├── schemas/                  Pydantic v2
│   │   └── chat_quotation.py     V2.1: ClientInfo + Thread/Message schemas
│   │
│   ├── routes/                   Endpoints por subcontexto
│   │   ├── auth.py, catalog.py, cart.py, quotations.py
│   │   ├── admin.py, admin_services.py
│   │   ├── invoices.py, service_quotations.py
│   │   ├── uploads.py            upload_file_to_imgbb() reutilizable
│   │   └── chat_quotation.py     V2.1: 10 endpoints cliente + admin
│   │
│   ├── migrations/
│   │   ├── versions/             Alembic (última: d4e5f6a7b8c9 = V2.1)
│   │   └── v2_1_chat_quotations_neon.sql   Script SQL idempotente manual
│   │
│   ├── scripts/
│   │   ├── ingest_catalogs.py    Extrae productos de PDFs
│   │   └── extract_to_json.py    Genera catalog_data.json
│   │
│   ├── catalog_data.json         2715 productos pre-extraídos
│   ├── brochure_knowledge.json   Servicios base del brochure
│   └── core/security.py          JWT + bcrypt
│
├── frontend/
│   ├── vercel.json               Config Vercel
│   ├── tailwind.config.js        Incluye keyframe `gradient` custom
│   ├── vite.config.ts            Proxy dev + config (sin alias @/)
│   └── src/
│       ├── pages/                Landing, Login, Register, Dashboard, Admin
│       ├── services/api.ts       Axios instance con JWT auto-inyectado
│       ├── context/              AuthContext, CartContext
│       └── components/
│           ├── Admin/
│           │   ├── CatalogPanel, ServicesPanel, InvoicesPanel
│           │   ├── ServicePricingPanel, InventoryForm/Panel
│           │   └── Quotation/    V2.1: AdminChatPanel + QuotationsPanel
│           └── Client/
│               ├── ProductCatalogGrid, ServiceBrowser, CartSection
│               ├── InvoiceList, QuotationsHistory (legacy)
│               └── Quotations/   V2.1: ClientQuotationsList + ClientChatView
│
└── docs/
    ├── sesion_security_01.md         SC-SECURITY-01
    ├── sesion_admin_02.md            SC-ADMIN-02
    ├── sesion_client_01.md           SC-CLIENT-01
    └── v2_1_chat_cotizaciones.md     V2.1 (este shipment)
```

---

## Variables de Entorno

### Railway (Backend)
| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://...@neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | Clave JWT |
| `IMGBB_API_KEY` | Para CDN externo de adjuntos/imágenes |
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

## Desarrollo Local

```bash
# Arranque completo
docker-compose up --build

# Accesos
Sitio web:          http://localhost
API Swagger:        http://localhost/api/v1/docs
API ReDoc:          http://localhost/api/v1/redoc
```

---

## Migraciones

### Alembic (recomendado)
```bash
docker-compose exec backend alembic revision --autogenerate -m "descripcion"
docker-compose exec backend alembic upgrade head

# Producción: GET /api/v1/setup?key=SECRET_KEY
```

### SQL manual en Neon (cuando Alembic no es viable)
Hay scripts SQL idempotentes en `backend/migrations/*.sql` para correr a mano
desde el Neon SQL Editor. Ejemplo: `v2_1_chat_quotations_neon.sql` crea las
tablas del chat + campos de perfil del user, con `IF NOT EXISTS` y reparación
automática si hubo versiones previas rotas.

---

## Carga inicial de Catálogos

Los 2715 productos se extraen de 13 PDFs de fabricantes (Hikvision, Ubiquiti, SIEMON, etc.):

```bash
# 1. Extraer localmente
cd backend && python scripts/extract_to_json.py
# Genera catalog_data.json (~664KB vs ~54MB de PDFs)

# 2. Subir a Neon por lotes (200 productos/lote)
GET /api/v1/setup-catalogs?key=SECRET_KEY&batch=1
GET /api/v1/setup-catalogs?key=SECRET_KEY&batch=2
... hasta batch=14
```

---

## Gotchas del Stack (cosas que no son obvias al leer el código)

### Frontend
- **No hay alias `@/`** — usar imports relativos (`../../services/api`).
- **`date-fns` NO está instalado** — usar helpers manuales con `toLocaleDateString`.
- **lucide-react 1.7.0 (antigua)** — algunos nombres chocan con tipos nativos: usar `Image as ImageIcon`, `File as FileIcon`.
- **`AuthContext` NO expone `token`** — el JWT está en `localStorage.cjdg_token` y lo inyecta automáticamente el interceptor de `api` (axios). Nunca usar `fetch + Authorization manual`.
- **`ClientDashboard` usa navegación por estado** (`activeSection`), no URL routes. Para integrar una sección nueva: agregar al `SectionType` y renderizar condicionalmente.

### Backend
- **`service_catalog.id` es `INTEGER`** (no UUID). Cualquier FK a esa tabla debe ser Integer.
- **SQLAlchemy: `metadata` es atributo reservado** en `Base`. Para columnas JSONB llamadas `metadata`, usar atributo ORM distinto: `message_metadata = Column("metadata", JSONB)`.
- **Alembic + SQL manual coexisten** — las migraciones deben ser idempotentes (`CREATE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- **Upload reutilizable**: `routes/uploads.py` expone `upload_file_to_imgbb(file)` sin auth; intenta ImgBB, cae a filesystem local si falla.
- **Endpoints "public" deben ser públicos**: ej. `/corporate-services-public` no lleva `get_current_user` — si lo agregas, provoca cascadas de 401 que borran el token del cliente.

---

## Notas Técnicas de Deploy

### Región Railway
Actualmente en `us-west` (movido desde `asia-southeast1-eqsg3a`/Singapur para reducir latencia desde LATAM: ~350ms → ~100ms por request).

### CORS
`allow_origins=["*"]` con `allow_credentials=False` porque la auth es via Bearer token (no cookies).

### Base de datos Neon
- `QueuePool` con `pool_pre_ping=True` y `pool_recycle=300` para reconectar tras idle.
- `joinedload` en queries complejas para evitar N+1.

### 307 Redirect + Mixed Content
Usar `""` en vez de `"/"` en routers montados con prefix, y `redirect_slashes=False` en el app — FastAPI redirigía a HTTP detrás de Railway.

---

## Estado al 2026-04-17

- Último commit: `ab8a323` — Docs actualizados (README + doc V2.1)
- V2.1 Chat-Cotizaciones shipeado: `18d2c60` · Hero especial: `5bb6594`
- Feature probada en producción con usuario `crudopb · CLIENTE`
- Región Railway movida a `us-west` → UX ~3-4x más rápida desde LATAM

---

## Próxima versión: V2.2 Dashboard Home (planificada)

Hub de inicio para el cliente que reemplaza la actual "Panel General" vacía con:

- **HeroSection** con "Acerca de CJDG" + CTAs a catálogo y cotización.
- **SpecialServicesWidget** — 3 cards de servicios destacados (`is_special`).
- **OffersWidget** — grid/carrusel de productos en oferta (`is_offer`).
- **QuickAccessNav** — links rápidos a las 4 secciones principales.
- **Sidebar**: "Panel General" → **"Inicio"** con icono `Home`.

Endpoints nuevos:
- `GET /api/v1/catalog/offers?limit=6` — productos con mayor descuento.
- `GET /api/v1/services/special` — hasta 3 servicios destacados activos.

Detalle completo en [docs/v2_2_dashboard_home.md](docs/v2_2_dashboard_home.md).
Specs originales del usuario en `feat/*.md` (fuera del repo).
