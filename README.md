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
| Frontend (canonical) | <https://www.proyectoscjdg.com> |
| Backend API | <https://proyectos-cjdg-production.up.railway.app/api/v1> |
| Health Check | <https://proyectos-cjdg-production.up.railway.app/api/v1/health> |
| WebSocket | `wss://proyectos-cjdg-production.up.railway.app/api/v1/ws?token=<JWT>` |
| Neon Console | `console.neon.tech/app/projects/purple-tree-14242206` |

> El dominio `proyectos-cjdg.vercel.app` redirige (308) al canonical `www.proyectoscjdg.com`.

---

## Arquitectura de Producción

```
Browser
  │
  ├── https://www.proyectoscjdg.com (Frontend React/Vite)
  │     VITE_API_URL → Railway directamente
  │     axios `api` instance con JWT auto-inyectado (services/api.ts)
  │     WebSocketProvider con una conexión por user (reconexión + heartbeat)
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

## Versión Actual: V2.9 "Historial de Transacciones" (Apr 2026)

Serie de iteraciones V2.2 → V2.9 que añaden OAuth, perfil fiscal, notificaciones, WebSocket realtime, export API, API keys y ahora **historial de transacciones con control de inventario completo**. Ver [CHANGELOG.md](CHANGELOG.md) para el detalle por versión.

### V2.9 — Historial de Transacciones (FEAT-Historial-v2.4)

- **Archivado automático** de facturas (PAID/CANCELLED/OVERDUE) y cotizaciones (closed/quoted/cancelled tras 7d).
- **Control de stock** con reserva (`stock_reservado`) en checkout, confirmación al pagar, liberación al cancelar. Catálogo cliente muestra disponible (`físico − reservado`).
- **Historial paginado** para admin (CRUD + Excel export + bulk delete) y cliente (read-only con timeline).
- **Cliente puede**: eliminar facturas PENDING (libera stock), ocultar/recuperar conversaciones del chat, elegir factura/nota de entrega en checkout.
- **Modales en TODAS las acciones críticas**: edición catálogo y servicios (no más inline), cambios de status invoice/thread, eliminaciones, bulk delete con confirmación de respaldo.
- **Deploy resilience**: `scripts/migrate_resilient.py` con DDL idempotente porque la DB de prod tiene drift fuera de alembic; `Dockerfile.prod` ejecuta migración antes de uvicorn.
- **`services/errors.ts` con `formatApiError(err, fallback)`** — convierte detail dict (PROFILE_INCOMPLETE, etc) a string legible para evitar React error #31.

### Features clave vigentes

**Autenticación (V2.2)**
- Registro/login tradicional con username + password
- **Google OAuth 2.0** (authlib): auto-crea usuario CLIENTE, username derivado del email
- Primera sesión OAuth → redirect a `/onboarding` para elegir tipo (empresa/particular)
- Set/change password desde el panel (soporta cuentas OAuth-only sin password local)

**Perfil fiscal (V2.5–V2.6)**
- Tipo de cuenta: `empresa` (RIF) o `particular` (cédula) — UI etiqueta condicional
- Campos: `full_name`, `first_name`, `last_name`, `phone`, `company_name`, `fiscal_address`, `rif`, `rif_file_url`, `profile_photo_url`
- Upload de archivo del RIF (PDF o imagen) + foto de perfil (logo/avatar) vía ImgBB
- Banner en dashboard que gatea completar perfil (`!account_type || !rif || !fiscal_address`)

**Chat-cotizaciones (V2.1) + tiempo real (V2.8)**
- Hilos persistentes con estado (`pending`, `active`, `quoted`, `negotiating`, `closed`, `cancelled`)
- Adjuntos de archivos/imágenes (ImgBB), mensajes de sistema automáticos al cambiar estado
- **Sin polling**: WebSocket único por usuario entrega `chat_message` + `thread_updated` instantáneo

**Notificaciones (V2.7)**
- Tabla `notifications` con UUID FK a users, tipos: `chat_message`, `quotation_status`, `invoice_created`, `invoice_status`
- Disparadas automáticamente desde chat/invoices con helper `services.notifications.notify()`
- Campana en el header del dashboard cliente con badge + dropdown (sin polling — vía WebSocket)

**Admin API (V2.8)**
- `GET /admin/export-all` — JSON unificado (usuarios, catálogo, invoices+items, quotations+messages, notifications, settings). Auth dual: JWT admin OR header `X-API-Key`.
- **Sistema de API Keys**: admin crea/revoca/borra desde tab "API Keys". Raw key se muestra UNA VEZ. SHA-256 en DB. Opcional `expires_at`.

### Endpoints V2.8 añadidos

```
# Auth
GET    /auth/google/login                 # Redirect a consent Google
GET    /auth/google/callback              # Callback → JWT → frontend (#token)
GET    /auth/verify                       # Perfil completo del user (incl. has_password)

# Perfil
GET    /users/profile                     # Perfil actual
PUT    /users/profile                     # Update parcial (exclude_unset)
POST   /users/profile/rif-upload          # RIF/Cédula (PDF/imagen)
POST   /users/profile/photo-upload        # Foto de perfil (solo imágenes)
POST   /users/password                    # Set (OAuth-only) o change (con verify actual)

# Notificaciones
GET    /notifications                     # Lista paginada
GET    /notifications/unread-count        # Badge count (cheap)
PUT    /notifications/{id}/read           # Marcar leída
PUT    /notifications/mark-all-read
DELETE /notifications/{id}

# Admin API
GET    /admin/export-all                  # Export JSON (JWT admin o X-API-Key)
POST   /admin/api-keys                    # Crear (raw once)
GET    /admin/api-keys                    # Lista (masked)
PATCH  /admin/api-keys/{id}               # Toggle is_active (revocar/reactivar)
DELETE /admin/api-keys/{id}               # Hard delete

# WebSocket
WSS    /ws?token=<JWT>                    # Conexión única por user
  Cliente → server: {action: "ping"|"subscribe_thread"|"unsubscribe_thread", ...}
  Server → cliente: {type: "notification"|"chat_message"|"thread_updated", payload}
```

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
- **Cotizaciones** → Chat-cotizaciones con drill-in al hilo (realtime WS)
- **Catálogo** → Gestión de productos físicos (precio, stock, ofertas, imágenes)
- **Servicios** → CRUD de servicios corporativos del Brochure CJDG
- **Facturación** → Invoices (`PRODUCT_SALE` y `SERVICE_QUOTATION`)
- **API Keys** → Crear/revocar tokens programáticos + docs del endpoint `/admin/export-all`
- **Ajustes Globales** → Toggles de e-commerce

### Panel Cliente (`/dashboard`)
- **Campana de notificaciones** en el header (contador + dropdown, realtime WS)
- **Banner fiscal** condicional: aparece si falta `account_type`, `rif` o `fiscal_address`
- **Inicio** → Overview + accesos rápidos
- **Catálogo** → Productos con checkout tipo Amazon
- **Mi Carrito** → Persistente
- **Servicios CJDG** → Browser por pilares + hero del servicio especial
- **Cotizaciones** → Lista de hilos + vista de chat con adjuntos (realtime WS)
- **Facturas** → Historial de compras y cotizaciones pagadas
- **Mi Perfil** → Datos personales, foto, tipo cuenta, info fiscal, seguridad (password)

### Onboarding OAuth (`/onboarding`)
- Página forzada en la primera sesión vía Google cuando `account_type IS NULL`
- Selección Empresa/Particular + nombre/apellido (prefill de Google) + teléfono
- Tras guardar → redirige a `/dashboard` (banner de info fiscal pendiente seguirá visible hasta completar RIF + dirección)

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
  ↔ mensajes en tiempo real (WebSocket instant push) con adjuntos ↔
  
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
│   │   ├── v2_1_chat_quotations_neon.sql
│   │   ├── v2_3_invoice_mention_neon.sql
│   │   ├── v2_4_oauth_google_neon.sql
│   │   ├── v2_5_complete_profile_neon.sql
│   │   ├── v2_6_account_type_photo_neon.sql
│   │   ├── v2_7_notifications_neon.sql
│   │   └── v2_8_api_keys_neon.sql
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
    └── v2_1_chat_cotizaciones.md     V2.1
```

---

## Variables de Entorno

### Railway (Backend)
| Variable | Requerida | Valor |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://...@neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | ✅ | Clave para JWT + SessionMiddleware (OAuth state) |
| `ENVIRONMENT` | ✅ | `production` |
| `GOOGLE_CLIENT_ID` | OAuth | Google Cloud Console → OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | OAuth | idem |
| `GOOGLE_REDIRECT_URI` | OAuth | `https://proyectos-cjdg-production.up.railway.app/api/v1/auth/google/callback` — **EXACTO** match con Google Cloud |
| `FRONTEND_URL` | OAuth | `https://www.proyectoscjdg.com` (destino del redirect post-login) |
| `IMGBB_API_KEY` | Opcional | CDN externo para uploads. Sin ella, caen a `/static/uploads` (efímero en Railway — se borra al redeploy) |

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

## Estado al 2026-04-18

- Último commit: `2496998` — V3 rediseño Tech-Gray masivo (31 archivos)
- Región Railway: **us-west** (movida desde Singapur)
- **Paleta activa:** Tech-Gray (cj-*) — migrada completa. Legacy `cjdg-*` aún en tailwind.config.js pero sin usos.

### Features shipeadas esta sesión

| Versión | Commits | Descripción |
|---|---|---|
| **V2.2** Dashboard Home | `64cb992`, `a96ff8c` | Hub del cliente: Hero + Special/Offers widgets con folder-overflow + QuickAccessNav |
| **V2.3** Invoice Mentions | `e4af8b8` | Cliente/Admin pueden referenciar facturas en chat (`message_type=invoice_mention`) |
| **V3 Fase 3.1** Cimientos | `4439e8b` | Tokens `cj-*` + `ThemeContext` + primitivas `components/ui/` |
| **V3 Fases 3.2+3.3** Rediseño | `2496998` | Migración masiva de paleta dark → Tech-Gray en toda la app (31 archivos) |

Detalle de cada feature: [docs/v2_2_dashboard_home.md](docs/v2_2_dashboard_home.md), [docs/v3_plan_redesign_y_facturas_en_chat.md](docs/v3_plan_redesign_y_facturas_en_chat.md), [rediseno/sesion_2026-04-18_resumen.md](../../rediseno/sesion_2026-04-18_resumen.md) (fuera del repo).

### Tokens Tech-Gray (activos)

```
Fondos:   cj-bg-{primary:#F8F9FA, secondary:#E9ECEF, tertiary:#DEE2E6}, cj-surface:#FFFFFF
Textos:   cj-text-{primary:#212529, secondary:#6C757D, muted:#ADB5BD}
Acento:   cj-accent-blue:#0D6EFD + -hover + -light (único acento permitido)
Sombras:  shadow-cj-{sm, md, lg, xl} (opacity ≤ 0.15)
Semánt.:  cj-success:#198754, cj-warning:#FFC107, cj-danger:#DC3545, cj-border:#CED4DA
```

### Qué NO se migró (intencional)
- Hero premium del `ServiceBrowser` (Crown + gradiente purple animado + sparkles).
- Hero del `ClientHome` (gradiente azul animado con orbs).
- `text-white` sobre burbujas azules del chat (contraste correcto).
- Badges rojos de notificación (unread, descuentos) — alto impacto.
- Overlays oscuros sobre imágenes (carousel arrows, tile backgrounds).
