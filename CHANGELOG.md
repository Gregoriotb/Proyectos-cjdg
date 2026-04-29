# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [V2.9] — 2026-04-29 · FEAT-Historial-Transacciones-v2.4

### Added — Historial de Transacciones, Stock Reserva/Liberación, tipo_documento

- **Migración `f1a2b3c4d5e6`** — schema completo del feature (tablas `transaction_history`, `transaction_history_items`, `stock_movements` + columnas a `invoices`, `quotation_threads`, `catalog_items`, `invoice_items`).
- **Stock Service** — modelo de inventario con `stock` físico vs `stock_reservado`. `reserve_stock` (checkout), `confirm_stock` (PAID/DELIVERED), `release_stock` (CANCELLED/OVERDUE). SELECT FOR UPDATE + log en `stock_movements`.
- **Archive Service** — `archive_invoice` / `archive_quotation_thread` con snapshot JSONB. `reactivate` mantiene `original_id` y marca `reactivated_at`. `sweep_quotations` archiva threads con `fecha_concretada` > 7d.
- **API Admin Historial** (`/admin/historial`): list paginado con filtros, detalle, cambio estado, reactivar, delete (single + bulk con `?confirmado=true`), export Excel (3 hojas), sweep manual.
- **API Cliente Historial** (`/cliente/historial`): list + detalle read-only scoped a `current_user.id` (404 si no es del cliente, no 403).
- **DELETE invoice cliente** (SC-05): solo si `status == PENDING` y no archivada. Soft-archive con `DELETED_BY_CLIENT` + libera stock.
- **Soft-delete chat per-thread** (SC-06): `PATCH /threads/{id}/ocultar` y `/recuperar`. Cliente oculta de su vista, admin sigue viéndolo.
- **tipo_documento en checkout** (SC-08): `factura` (requiere perfil fiscal completo) o `nota_entrega` (solo full_name + phone + email).
- **Triggers automáticos**: Invoice → terminal → auto-archive + ajuste stock; Thread → closed → marca `fecha_concretada` para sweep 7d; listados filtran `archivado_en IS NULL`.
- **Frontend**:
  - `components/ui/Modal.tsx` y `ConfirmDialog.tsx` reutilizables (variants destructive/warning, busy state).
  - `hooks/useHistorial.ts` shared admin + cliente con filtros y paginación.
  - Tab admin **Historial**: tabla, filtros, acciones por fila/globales, export Excel descarga blob.
  - Sección cliente **Mi Historial** mobile-first (cards mobile, tabla desktop).
  - Cart: selector visual tipo_documento.
  - ClientChatView: botón "Ocultar conversación" con ConfirmDialog.

### Decisiones arquitectónicas (vs spec original)

- Stack respetado: sync SQLAlchemy, axios crudo, primitivos UI propios. No se instalaron TanStack Query / shadcn / RHF / Zod / Sonner.
- Single-tenant (eliminado `empresa_id`). Estados en inglés en backend, traducidos solo en UI.
- Numeración generada al archivar (`INV-{id:06d}`, `COT-{first8(uuid)}`).
- Soft-delete chat per-thread (no per-message como pedía spec) — mejor UX.
- Reactivación mantiene `original_id`.
- TTL 7d lazy on read + endpoint manual (sin cron/trigger SQL).

### Dependencies
- `openpyxl==3.1.5` agregado a backend.

### Branches
- `feat/historial-transacciones` (backend, 6 commits) → mergeada a master.
- `feat/historial-frontend-v24` (frontend, 4 commits) → en proceso de merge.

---

## [V2.8] — 2026-04-22 · "Feat Grande" completo

### Added — API Keys, Export API, WebSocket Realtime

- **Sistema de API Keys** (`SC-API-KEYS-01`).
  - Tabla `api_keys` (UUID, user_id FK CASCADE, name, SHA-256 `key_hash`, visible `prefix`, `is_active`, opcional `expires_at`, `last_used_at`, `usage_count`).
  - Generador `pcjdg_<32hex>` (128 bits de entropía, hasheado antes de persistir).
  - Endpoints admin: `POST /admin/api-keys` (raw once), `GET /admin/api-keys` (masked), `PATCH /admin/api-keys/{id}` (toggle `is_active`), `DELETE /admin/api-keys/{id}`.
  - Nuevo tab **"API Keys"** en panel admin con modal de creación, modal raw-once con copy-to-clipboard, tabla de gestión y documentación integrada del endpoint con ejemplos curl/JS.
- **Auth dual en `/admin/export-all`**: acepta header `X-API-Key: pcjdg_...` **O** `Authorization: Bearer <JWT>` admin. Cada uso de API key incrementa `usage_count` y `last_used_at`.
- **Export expandido**: payload ahora incluye `notifications`, `chat_messages` completos por thread, y `ecommerce_settings` (antes sólo count de mensajes). `summary` expandido con totales de mensajes + notifs leídas/no leídas.
- **WebSocket realtime** (`SC-WS-01`, rama `feat/websocket-realtime`).
  - Endpoint `WSS /api/v1/ws?token=<JWT>` con auth por query string.
  - `WSManager` in-memory singleton: `connections: dict[user_id, set[WebSocket]]`, multi-tab soportado, `thread_subscribers` para features futuras.
  - Eventos server→cliente: `notification`, `chat_message`, `thread_updated`.
  - Acciones cliente→server: `ping`, `subscribe_thread`, `unsubscribe_thread`.
  - Triggers reemplazan polling: chat (cliente/admin send + status change), invoices (checkout + status change). Push directo a `send_to_user(client)` + `broadcast_to_admins()` evita race con subscribe_thread.
  - Frontend `WebSocketProvider` con: conexión única por user, heartbeat 25s, reconexión exponencial con jitter (cap 30s), re-suscripción automática de threads tras reconnect.

### Removed
- **Polling** eliminado de `ClientChatView`, `AdminChatPanel`, `ClientQuotationsList`, `QuotationsPanel`, `useNotifications` (antes: intervals cada 8-10s, 30s). Todo reemplazado por suscripciones WS.

### Fixed
- **Race condition en admin realtime**: admin a veces tardaba en ver mensajes del cliente porque `subscribe_thread` se perdía si el WS estaba en `CONNECTING` al abrir el chat. Fix: `chat_message` se envía directamente a `send_to_user(client_id)` + `broadcast_to_admins()`, sin depender del subscribe_thread handshake.
- **Canonical domain**: redirect 308 desde `proyectos-cjdg.vercel.app` a `www.proyectoscjdg.com` via `vercel.json` `has: host` matcher. Antes usuarios podían terminar en la URL de Vercel vía historial/bookmarks.

### Changed
- **Dockerfile.prod**: se intentó agregar BuildKit cache mounts para acelerar rebuilds, pero Railway exige formato de `id` proprietario incompatible con repos portables. Revertido a multi-stage simple con `pip install --no-cache-dir`.

---

## [V2.7] — 2026-04-22 · Notificaciones in-app

### Added
- **Tabla `notifications`** (`SC-NOTIF-01`): UUID PK, `user_id` FK CASCADE, `type` (4 valores enumerados), `title`, `message`, `metadata` JSONB, `is_read`, `created_at`. Índice parcial `WHERE is_read=false` para badge count barato.
- **Atributo Python `notification_metadata`** → columna SQL `metadata` (mismo patrón que `ChatMessage` para evitar choque con `SQLAlchemy.Base.metadata`).
- **Helper `services.notifications.notify()`**: INSERT + opcional WS push. `try/except` para que un fallo nunca tumbe el flow principal.
- **Triggers automáticos**:
  - Admin envía mensaje en chat → notif al cliente (`chat_message`).
  - Admin cambia estado de cotización → notif (`quotation_status`).
  - Cliente hace checkout → notif (`invoice_created`).
  - Admin cambia estado de factura → notif (`invoice_status`).
- **Endpoints**: `GET /notifications` (paginado), `GET /notifications/unread-count`, `PUT /notifications/{id}/read`, `PUT /notifications/mark-all-read`, `DELETE /notifications/{id}`.
- **`NotificationBell`**: componente con badge rojo de unread count, dropdown con last 20, iconos por tipo, click-outside, delete por item, click-to-navigate (thread para chats, invoices section para facturas).

---

## [V2.6] — 2026-04-22 · Tipo de cuenta + foto + password set/change

### Added
- **Columnas `account_type`** (`'empresa' | 'particular'`, CHECK constraint) y **`profile_photo_url`** en `users`.
- **Página `/onboarding`**: para OAuth users en su primera sesión (`account_type IS NULL`). Radio Empresa/Particular + prefill de nombre desde `full_name` de Google + teléfono opcional.
- **Endpoint `POST /users/password`**: único para set (OAuth-only) o change (verifica `current_password` primero).
- **Endpoint `POST /users/profile/photo-upload`** (solo imágenes vía `upload_file_to_imgbb`).
- **`SecurityPanel`** embebido en `ProfileForm`: muestra form de 2 campos (set) o 3 campos (change) según `has_password`.
- **ProfileForm refactor**: avatar uploader con icono contextual empresa/usuario, selector visual tipo cuenta, **label condicional** "RIF" / "Cédula de Identidad" según tipo, validación regex distinta por tipo, `company_name` oculto para particular.
- **Sidebar del dashboard**: muestra `profile_photo_url` si existe, sino icono empresa (si account_type=empresa) o usuario. Clickeable → va a sección Perfil.

### Changed
- **`/auth/verify`**: retorna `account_type`, `profile_photo_url`, `has_password` (bool derivado de `hashed_password IS NOT NULL`).
- **Banner del dashboard** ahora gatea por: `!account_type || !rif || !fiscal_address`.
- **`AuthCallback`**: si `oauth_provider && !account_type` → redirige a `/onboarding` en vez de `/dashboard`.

---

## [V2.5] — 2026-04-22 · Perfil fiscal del cliente

### Added
- **Columnas en `users`**: `rif` (VARCHAR(50) unique nullable), `rif_file_url` (VARCHAR(500)), `fiscal_address` (TEXT, renombrada de `address`).
- **Índice único parcial** `ux_users_rif` sobre `rif WHERE rif IS NOT NULL`.
- **Schema `ProfileUpdate`** con validación regex del RIF venezolano flexible.
- **Nuevo router `routes/users.py`**:
  - `GET /users/profile` — perfil completo del usuario actual
  - `PUT /users/profile` — update parcial (`exclude_unset`, valida RIF unique con 409)
  - `POST /users/profile/rif-upload` — PDF/imagen via `upload_file_to_imgbb`
- **`ProfileForm.tsx`**: componente completo con secciones (cuenta solo-lectura, datos personales, información fiscal). Upload del RIF con preview imagen o link a PDF.
- **Banner amarillo** en `ClientDashboard` si falta RIF o dirección fiscal (oculto en sección 'profile'). Click → navega a sección perfil.
- **`AuthContext.refreshUser()`**: método público para re-fetchear el perfil tras actualizar sin invalidar sesión.

### Changed
- `/auth/verify` retorna también `email`, `first_name`, `last_name`, `phone`, `company_name`, `fiscal_address`, `rif`, `rif_file_url`, `oauth_provider` (antes sólo rol/username/full_name).
- `login` endpoint: mensaje claro si la cuenta es OAuth-only (`hashed_password IS NULL`).

### Fixed
- **Lesson learned (orden migración)**: al renombrar `address → fiscal_address` se invirtió el orden recomendado y el backend en prod queríó la columna vieja durante la ventana entre SQL y merge → 500s en login y OAuth. Fix: se mergeo código de inmediato. Regla: **renames requieren deploy ANTES que SQL**; `ADD COLUMN` admite cualquier orden.

---

## [V2.4] — 2026-04-22 · Google OAuth end-to-end

### Added
- **OAuth Google** vía `authlib.integrations.starlette_client`.
- **`core/oauth.py`**: cliente `oauth.google` con OIDC discovery (`openid+email+profile`).
- **`SessionMiddleware`** en `main.py` (requerido por authlib para state/CSRF, cookie de 10 min solo para handshake).
- **Rutas**:
  - `GET /auth/google/login` — redirige al consent de Google
  - `GET /auth/google/callback` — exchange code, verifica id_token, crea/vincula usuario (match por `oauth_provider+oauth_id`; fallback por email; crea CLIENTE con username auto-generado si no existe), genera JWT propio, redirige a `{FRONTEND_URL}/auth/callback#token=JWT`.
  - Errores: redirige a `/login?oauth_error=<code>` con mensajes en español.
- **`hashed_password` nullable** + índice único parcial sobre `(oauth_provider, oauth_id)` para dedupe.
- **Frontend `AuthCallback` page**: lee token del URL fragment (no viaja al servidor), valida con `/auth/verify`, guarda sesión, redirige según rol.
- **Botón "Continuar con Google"** en Login y Register (full-width, reemplaza los botones GitHub+Google dual anteriores).

### Removed
- **GitHub OAuth**: botones, placeholders de ruta y referencias eliminados (decisión de producto — solo Google).

### Security
- **`.gitignore`** creado en raíz (antes no existía — repo público sin guardia). `backend/.env` ahora correctamente excluido.
- Secrets **nunca** commiteados. `.env.example` publicado con placeholders.

---

## [V2.3] — 2026-04-17 · Invoice mentions en chat

### Added
- `invoice_mention` agregado al CHECK constraint de `chat_messages.message_type`. Cliente y admin pueden referenciar facturas existentes dentro de mensajes (tarjeta visual con factura embebida).

### Fixed
- **Railway deploy failure**: restricción `decimal_places` de Pydantic incompatible con versión de prod. Resuelto pinning explícito en `requirements.txt`.

---

## [V2.2] — 2026-04-17 · Security fields base

### Added
- Columnas `oauth_provider`, `oauth_id` en `users` (preparación OAuth, sin lógica todavía).
- `/api/v1/auth/verify` para validar JWT desde el frontend en cada carga de ruta protegida.
- Migración Alembic `a1b2c3d4e5f6_sc_security_01_user_fields`.

---

## [V2.1] — 2026-04-17 · Chat-Cotizaciones

### Added
- Tabla `quotation_threads` (UUID, estado de hilo, contadores unread por lado, `last_message_at`).
- Tabla `chat_messages` con `message_metadata` (JSONB, Python attr mapeado a columna `metadata`), soporte de adjuntos (URL ImgBB), tipos: text/file/image/system/status_change/budget_update.
- 10 endpoints `/chat-quotations/*` (cliente + admin).
- Componentes `ClientQuotationsList`, `ClientChatView`, `QuotationsPanel`, `AdminChatPanel` (polling original, reemplazado por WS en V2.8).
- User profile extendido: `first_name`, `last_name`, `phone`, `company_name`, `address`.
- Hero premium del servicio destacado (gradiente animado, sparkles).

### Removed
- Tabla `service_quotations` (muerta, reemplazada por hilos).

---

## Convenciones internas

- **Branches**: una por feat. Merge fast-forward a `master` tras test manual.
- **SQL**: archivos `backend/migrations/v<major>_<minor>_*_neon.sql`, idempotentes. Ejecutados manualmente en Neon SQL Editor (Alembic usado sólo para tracking de versiones, no para aplicar).
- **Subcontextos**: cada módulo marca su contexto con un comentario `[CONTEXT: NAMESPACE]` y tag `SC-<name>-<NN>` (ej. `SC-WS-01`, `SC-NOTIF-01`).
