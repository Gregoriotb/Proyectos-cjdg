# Informe de Sesión: Feat Grande (V2.4 → V2.8)
**Fecha:** 22 de Abril de 2026
**Proyecto:** Ecosistema Operativo CJDG
**Subcontextos tocados:** USER_GATEWAY · NOTIFICATIONS · REALTIME · ADMIN_CONSOLE · SYSTEM_CORE
**Duración aproximada:** sesión completa (desde OAuth inicial hasta documentación)

---

## Resumen Ejecutivo

Sesión maratón que transformó la plataforma de un MVP con login básico + chat con polling a un ecosistema con autenticación social, perfil fiscal completo, notificaciones push en tiempo real, API programática con gestión de tokens, y documentación actualizada.

**Versiones shipeadas:** V2.4, V2.5, V2.6, V2.7, V2.8 + 5 fixes y optimizaciones.

**Métrica cruda:**
- **16 commits** a master (todos fast-forward merges desde branches feat/fix/chore)
- **8 migraciones SQL** aplicadas en Neon
- **2 fixes de Dockerfile** tras errores de Railway BuildKit
- **0 rollbacks** — toda feature deployada quedó estable tras el fix correspondiente

---

## Fases completadas

### Fase 0 — `fix/spa-routing-404` (commit `64b7555`)
**Problema:** `frontend/vercel.json` estaba vacío `{}`, causando 404 en cualquier ruta directa distinta de `/` (incluyendo `/auth/callback` al que Google redirige post-OAuth).
**Fix:** rewrite `/(.*)` → `/index.html` para que React Router maneje todas las rutas.

### Fase 1 — `feat/google-oauth` + `feat/complete-profile` (V2.4 + V2.5)

**V2.4 OAuth Google** (commits `a2571cb`, `e75ab23`, `96de756`):
- Cliente authlib con OIDC discovery de Google.
- `SessionMiddleware` agregado para state/CSRF.
- Rutas `/auth/google/login` y `/auth/google/callback` con match por `(oauth_provider, oauth_id)` → fallback email → crea usuario CLIENTE auto si no existe.
- Redirect a `{FRONTEND_URL}/auth/callback#token=<JWT>` (fragment, no logueable).
- Frontend: página `AuthCallback`, botón "Continuar con Google" en Login/Register.
- **GitHub OAuth removido** (decisión de producto, sólo Google).
- **`.gitignore` creado en raíz** — crítico porque el repo es público y no tenía ninguno, `backend/.env` se iba a terminar committeado con secrets.

**V2.5 Perfil Fiscal** (commit `e84fa25`):
- Modelo `User`: agregado `rif` (unique), `rif_file_url`, rename `address → fiscal_address`.
- Nuevo router `routes/users.py`: `GET /users/profile`, `PUT /users/profile`, `POST /users/profile/rif-upload`.
- Reuso de `upload_file_to_imgbb` para el archivo RIF (ImgBB + fallback local).
- Schema `ProfileUpdate` con validación regex de RIF venezolano flexible.
- Componente `ProfileForm.tsx` con secciones, upload con preview, validación optimista.
- Banner amarillo en `ClientDashboard` cuando falta RIF o dirección fiscal.

**⚠️ Gotcha real:** al renombrar `address → fiscal_address` se pidió al user correr el SQL primero y luego mergear el código. Esto rompió login y OAuth en prod porque el modelo en Railway aún esperaba la columna vieja. **Se corrigió mergeando el código de inmediato.** Aprendizaje guardado en memoria: renames de columna requieren deploy ANTES que SQL; `ADD COLUMN` admite cualquier orden.

### Fase 1.5 — `feat/profile-extras` (V2.6, commit `736080e`)
Expansión tras feedback del usuario: "cada cuenta debe declarar si es empresa o particular, con RIF o Cédula según corresponda. Y foto de perfil. Y password set/change incluso para cuentas OAuth."

- Columnas `account_type` (`empresa|particular`, CHECK constraint) y `profile_photo_url`.
- Schema `PasswordSetOrChange` con lógica de `current_password` opcional (si la cuenta es OAuth-only).
- Endpoint `POST /users/password` → si no hay password, lo establece; si hay, requiere verificación del actual.
- Endpoint `POST /users/profile/photo-upload` (solo imágenes).
- Nueva página `/onboarding`: forzada en primera sesión Google para elegir Empresa/Particular + prefill nombre/apellido.
- `AuthCallback` redirige a `/onboarding` si `oauth_provider && !account_type`.
- `ProfileForm` refactor completo: avatar uploader contextual, selector tipo cuenta, **label condicional** "RIF" o "Cédula" según tipo, validación distinta, `company_name` oculto para particular, `SecurityPanel` embebido.
- Sidebar del dashboard muestra foto de perfil; clickeable para ir a sección perfil.
- `/auth/verify` expone `account_type`, `profile_photo_url`, `has_password` (bool derivado).

### Canonical domain fix — `fix/canonical-domain` (commit `fafe85e`)
`proyectos-cjdg.vercel.app` redirige 308 a `www.proyectoscjdg.com` via `vercel.json` `has: host` matcher. Solo afecta el alias de producción, los preview deploys quedan accesibles.

### Fase 2 — `feat/notifications` (V2.7, commit `4253043`)
- Tabla `notifications` (UUID PK, `user_id` FK CASCADE, type, title, message, metadata JSONB, is_read, created_at).
- **Atributo Python `notification_metadata`** → columna SQL `metadata` (mismo patrón que `ChatMessage` para evitar choque con `SQLAlchemy.Base.metadata`).
- Helper `services.notifications.notify()` con `try/except` total — un fallo de notif NUNCA tumba el flow principal.
- **4 triggers integrados:**
  - Admin envía mensaje en chat → notif al cliente
  - Admin cambia status de cotización → notif al cliente
  - Cliente hace checkout → notif (confirmación)
  - Admin cambia status de factura → notif al cliente
- Endpoints completos (list, unread-count, mark-read, mark-all-read, delete).
- `NotificationBell` con badge rojo, dropdown con 20 items, iconos por tipo, click-outside, click-to-navigate (route según tipo).

### Fase 3 — `feat/websocket-realtime` (V2.8, commit `5b6812c`)

**Backend:**
- `services/ws_manager.py`: `WSManager` singleton in-memory con `dict[user_id, set[WebSocket]]` (multi-tab), `thread_subscribers` para chat, métodos async para `send_to_user`, `broadcast_to_admins`, `broadcast_to_thread`.
- Endpoint `WSS /api/v1/ws?token=<JWT>` con auth por query string (JWT validado en handshake, close 1008 si inválido).
- Acciones cliente→server: `ping`, `subscribe_thread`, `unsubscribe_thread`.
- Eventos server→cliente: `notification`, `chat_message`, `thread_updated`.
- `notify()` helper extendido con param `background_tasks` — si se pasa, también pushea WS.
- `chat_quotation.py` y `invoices.py` pasan `BackgroundTasks` a los triggers; tras commit, queuean push WS.

**Frontend:**
- `WebSocketProvider` con una conexión por user, heartbeat 25s, reconexión exponencial con jitter (cap 30s), registry de listeners por tipo, tracking de threads suscritos para re-suscribirse tras reconnect.
- `useNotifications` migrado de polling 30s → suscripción a `notification` events.
- `ClientChatView`, `AdminChatPanel`, `ClientQuotationsList`, `QuotationsPanel` migrados de `setInterval 8-10s` → suscripción a `chat_message` + `thread_updated`.

**Resultado:** **cero polling en el frontend** (excepto el heartbeat interno del WS). Mensajes aparecen en ~100ms.

### Hotfix realtime — `fix/admin-realtime-race` (commit `d0b2270`)
Admin tardaba en ver mensajes del cliente. Diagnóstico: race entre `subscribeThread()` y el handshake del WebSocket (cuando abría AdminChatPanel con el WS aún en `CONNECTING`, la acción se perdía).

**Fix:** `chat_message` se envía directamente a `send_to_user(client_id)` + `broadcast_to_admins()`, sin depender del subscribe_thread handshake. El frontend filtra por `thread_id` al recibir. `broadcast_to_thread` se conserva para features futuras (typing indicators, presencia).

### Fase 4 — `feat/admin-export-api` + `feat/api-keys` (V2.8, commits `402f3ab`, `be0c11c`)

**Export inicial:**
- `GET /admin/export-all` con `selectinload` para evitar N+1 en Invoice.items y QuotationThread.messages.
- Cache en memoria 5min (`?refresh=true` lo bypassea).
- Excluye `hashed_password` y `oauth_id`. Expone `has_password` como bool derivado.

**Expansión con API Keys** (pedido del user: "quiero que sea una API con su menú en el admin para gestionar y sacar API KEY"):
- Tabla `api_keys` con SHA-256 hash del raw key, `prefix` visible para UI, `is_active`, `expires_at` opcional, `usage_count`, `last_used_at`.
- Formato: `pcjdg_<32hex>` (128 bits entropía). Raw NUNCA se guarda.
- **Auth dual** en `/admin/export-all`: acepta header `X-API-Key: pcjdg_...` O `Authorization: Bearer <JWT>` admin. Cada uso por API key incrementa `usage_count`.
- Endpoints CRUD: crear (raw once), listar (masked), toggle `is_active` (revocar sin borrar), hard delete.
- **Nuevo tab "API Keys"** en admin panel: tabla de gestión, modal de creación con presets de expiración (Nunca/30d/90d/1año), modal raw-once con copy-to-clipboard, documentación integrada del endpoint con curl/JS examples.
- Export expandido: ahora incluye `notifications`, `chat_messages` completos por thread, `ecommerce_settings`.

### Optimizaciones que fallaron — `chore/docker-cache` + 2 fixes (`c14bfda`, `887e752`, `9f4183a`)

Intento de acelerar deploys en Railway con BuildKit cache mounts. Falló dos veces:
1. Primer error: "MUST be in format `id=<cache-id>`" → agregué ids (cjdg-pip-cache, etc.)
2. Segundo error: "Cache mount ID is not prefixed with cache key" → Railway requiere prefix con cache key interno propio del service, imposible de hardcodear portablemente.

**Solución:** revertí a Dockerfile.prod simple sin `--mount=type=cache`. Perdimos la optimización, ganamos deploy que funciona. **Lesson learned guardada en memoria** para no volver a intentar.

### Fase 5 — `chore/docs-feat-grande` (commit `78ad345`)
- `README.md` actualizado: URL canonical, sección V2.8 con resumen por área, tabla de endpoints nuevos, env vars ampliadas, lista de migraciones SQL completa, menciones de WebSocket reemplazando polling.
- `CHANGELOG.md` creado con formato Keep a Changelog, cubriendo V2.1 → V2.8 con detalle por Added/Changed/Fixed/Removed/Security.

---

## Decisiones clave tomadas

| # | Decisión | Por qué |
|---|---|---|
| 1 | OAuth registra directamente (no `oauth-complete` con temporal_token) | User quiere fricción mínima; RIF/fiscal se llenan luego desde banner del dashboard |
| 2 | Rename `address` → `fiscal_address` (no doble columna) | Semántica más limpia; pagamos un incidente de prod y aprendimos el orden correcto |
| 3 | `rif` único campo para RIF+Cédula (UI etiqueta según `account_type`) | Evita otro rename arriesgado; validación distinta per tipo en frontend |
| 4 | Onboarding forzado solo para OAuth primer login | User quiere registro normal intacto; OAuth necesita al menos elegir empresa/particular |
| 5 | `chat_message` push directo en vez de `broadcast_to_thread` | Elimina race condition con subscribe_thread handshake |
| 6 | API Keys con raw-once + SHA-256 (no bcrypt) | Raw key ya tiene 128 bits de entropía; hash rápido + búsqueda por `WHERE key_hash = ...` es suficiente |
| 7 | Cache export 5min en memoria (no Redis) | Railway corre worker único; migrar a Redis es opcional para escalar |
| 8 | Reusar `upload_file_to_imgbb` para foto y RIF | Ya probado, con fallback local, dual-use endpoint para imágenes y PDFs |

---

## Estado final del sistema

**Ecosistema operativo:**
- ✅ Login tradicional + Google OAuth con onboarding condicional
- ✅ Perfil fiscal completo (empresa/particular + RIF/CI + dirección + foto + archivo)
- ✅ Password set/change inteligente (soporta cuentas OAuth-only)
- ✅ Chat-cotizaciones en tiempo real (WebSocket, 0 polling)
- ✅ Notificaciones in-app con realtime push
- ✅ Campana con contador + dropdown + click-to-navigate
- ✅ API pública `/admin/export-all` con auth JWT o API Key
- ✅ Panel admin para gestionar API Keys
- ✅ Canonical domain, SPA routing, Railway deploy funcional

**Pendiente declarado:**
- Purga de usuarios no-admin (SQL entregado, ejecutar en Neon cuando el user esté listo para tests desde cero)
- Migración a Redis si se escala a multi-worker
- Indicador visual de estado WS en el header (opcional, nice-to-have)

---

## Tabla de commits de la sesión

| Commit | Mensaje |
|---|---|
| `a2571cb` | feat(auth): preparar Google OAuth — fase 1 (credenciales + cleanup) |
| `e75ab23` | chore(auth): .env.example apunta a URLs de Railway/Vercel |
| `96de756` | feat(auth): OAuth Google end-to-end (SC-AUTH-OAUTH) |
| `64b7555` | fix(spa): rewrite all routes a /index.html en Vercel |
| `e84fa25` | feat(profile): perfil fiscal del cliente (RIF, dirección, archivo) |
| `736080e` | feat(profile): tipo de cuenta + foto perfil + set/change password + onboarding OAuth |
| `fafe85e` | fix(vercel): canonical domain — redirect 308 desde *.vercel.app a www |
| `4253043` | feat(notifications): sistema in-app + 4 triggers (chat, status, facturas) |
| `5b6812c` | feat(realtime): WebSocket end-to-end (notifs + chat + listas) — sin polling |
| `d0b2270` | fix(realtime): admin recibe chat_message sin depender de subscribe_thread |
| `c14bfda` | chore(docker): BuildKit cache mounts + .dockerignore mas agresivo |
| `402f3ab` | feat(admin): endpoint unificado GET /admin/export-all |
| `be0c11c` | feat(api-keys): sistema API Keys + export expandido + dual auth |
| `887e752` | fix(docker): cache mounts requieren id= en Railway BuildKit |
| `9f4183a` | fix(docker): remover BuildKit cache mounts — incompatibles con Railway |
| `78ad345` | docs: README actualizado a V2.8 + CHANGELOG completo |

---

## Lecciones aprendidas

1. **Renames de columna y deploy order:** siempre desplegar código primero, aplicar SQL después. `ADD COLUMN` tolera cualquier orden, `RENAME`/`DROP`/type changes no.
2. **BuildKit cache mounts no funcionan portablemente en Railway:** no volver a intentar sin investigar el sandboxed específico de la plataforma.
3. **Race conditions en WebSocket subscriptions:** confiar en push directo al usuario conocido (send_to_user + broadcast_to_admins) antes que subscribe-then-broadcast.
4. **Repos públicos sin `.gitignore` son un riesgo latente:** siempre crear `.gitignore` antes de cualquier `.env`.
5. **Idempotencia en SQL:** `IF NOT EXISTS` en CREATE TABLE/INDEX + `DO $$ ... $$` en ALTER condicional evitan errores al re-ejecutar scripts en Neon.
