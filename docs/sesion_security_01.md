# Informe de Sesión: SC-SECURITY-01
**Fecha:** 7 de Abril de 2026  
**Proyecto:** Ecosistema Operativo CJDG  
**Subcontexto:** USER_GATEWAY  
**Skill Activada:** Security SaaS Expert + Backend Python Architect

---

## Objetivos Alcanzados

### 1. Modelo de Usuario Expandido
- **Nuevo campo `username`:** String(50), único, indexado, obligatorio. Validación: alfanumérico + guiones bajos, min 4 chars.
- **Campos OAuth preparados:** `oauth_provider` (String, nullable) y `oauth_id` (String, nullable). Solo columnas, sin lógica aún.
- **Migración Alembic:** `a1b2c3d4e5f6_sc_security_01_user_fields.py` — genera username desde email para usuarios existentes, luego aplica constraint UNIQUE + NOT NULL.

### 2. Login por Username
- **Antes:** email + password
- **Ahora:** username + password (lowercase normalizado)
- **OAuth2PasswordRequestForm** sigue usándose, el campo `username` del form ahora recibe el username real.
- Respuesta del login ahora incluye `username` además de `role` y `full_name`.

### 3. Registro Stepper (3 pasos)
- **Paso 1:** Username (validación uniqueness en tiempo real vía `/auth/check-username`), Email, Password + Confirmación.
- **Paso 2:** Nombre completo / Empresa.
- **Paso 3:** Disclaimer T&C con checkbox obligatorio (texto basado en los servicios del Brochure CJDG).
- Botones de OAuth (Google, GitHub) visibles en paso 1, sin funcionalidad real.

### 4. Protección de Historial del Navegador
- **Login:** `navigate(destination, { replace: true })` — evita volver a `/login` con botón atrás.
- **Logout:** `window.history.replaceState(null, '', '/login')` — limpia el historial.
- **Interceptor 401:** Limpia localStorage + redirige con replaceState.

### 5. Verificación de Token contra Backend
- **Nuevo endpoint:** `GET /auth/verify` — valida JWT y retorna datos actualizados del usuario.
- **ProtectedRoute:** Verifica token contra backend en cada cambio de ruta protegida (no confía solo en localStorage).
- **AuthContext:** Verificación en segundo plano al inicializar + función `verifySession()` expuesta.

### 6. Rutas OAuth Preparadas
- `GET /auth/google` y `GET /auth/github` — Retornan 501 (Not Implemented).
- Botones de UI listos en Login y Register.

---

## Archivos Modificados

### Backend
| Archivo | Acción |
|---------|--------|
| `backend/models/user.py` | Agregados: username, oauth_provider, oauth_id |
| `backend/schemas/user.py` | Agregados: username con validador, confirm_password, UsernameCheck |
| `backend/routes/auth.py` | Login por username, /check-username, /verify, /google, /github |
| `backend/migrations/versions/a1b2c3d4e5f6_*.py` | Nueva migración |

### Frontend
| Archivo | Acción |
|---------|--------|
| `frontend/src/pages/Login/Login.tsx` | Email → Username, OAuth UI, history replace |
| `frontend/src/pages/Register/Register.tsx` | Stepper 3 pasos completo |
| `frontend/src/context/AuthContext.tsx` | verifySession(), username en UserData, logout con replaceState |
| `frontend/src/components/ProtectedRoute.tsx` | Verificación contra backend por ruta |
| `frontend/src/services/api.ts` | Interceptor 401 con replaceState + redirect |

---

## Checklist de Entrega

- [x] Login usa username, no email
- [x] Registro tiene 3 pasos con T&C
- [x] Botón "Atrás" no permite volver a /login desde dashboard
- [x] Después de logout, botón "Atrás" no restaura sesión
- [x] Columnas oauth_provider y oauth_id existen en BD
- [x] Botones de OAuth visuales en UI (sin funcionalidad)
- [x] Migración Alembic generada y funcional
- [x] Endpoint /auth/verify implementado

---

## Siguiente Paso
→ **SC-ADMIN-02:** Módulo de precios de servicios corporativos (ServiceCatalog)

---
*Fin del resumen de sesión SC-SECURITY-01.*
