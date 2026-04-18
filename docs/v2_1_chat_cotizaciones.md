# V2.1 — Chat-Cotizaciones con Adjuntos

**Fecha:** Abril 2026
**Commits clave:** `18d2c60` (feature base) → `5bb6594` (hero destacado)

## Resumen

Reemplaza el flujo muerto de "service_quotations" (tabla de leads sin interacción) por un sistema de **hilos de conversación persistentes** admin↔cliente, con **adjuntos de archivos/imágenes** vía ImgBB.

## Qué cambió

### Backend
- **Nuevos modelos** (`models/chat_quotation.py`):
  - `QuotationThread` — hilo por cotización con estado y contadores de no leídos.
  - `ChatMessage` — mensaje con `sender_type` (client/admin/system), adjuntos opcionales y `message_metadata` (JSONB).
- **User extendido** — `first_name`, `last_name`, `phone`, `company_name`, `address` para mostrar contexto al admin.
- **10 endpoints REST** bajo `/api/v1/chat-quotations/*` (5 cliente + 5 admin).
- **`routes/uploads.py` refactorizado** — exporta `upload_file_to_imgbb(file)` como función reutilizable sin auth.

### Frontend
- **Componentes nuevos:**
  - `components/Client/Quotations/ClientQuotationsList.tsx` — lista de hilos del cliente.
  - `components/Client/Quotations/ClientChatView.tsx` — vista de chat con sidebar de contexto.
  - `components/Admin/Quotation/QuotationsPanel.tsx` — lista admin con badges de no leídos.
  - `components/Admin/Quotation/AdminChatPanel.tsx` — chat + sidebar de datos del cliente.
- **Integración:**
  - `ClientDashboard` sección "Cotizaciones" reemplaza la vieja `QuotationsHistory`.
  - `Admin.tsx` tab "Cotizaciones Entrantes" usa `QuotationsPanel`.
  - `ServiceBrowser` modal crea el hilo inicial con presupuesto opcional via `POST /chat-quotations/threads`.
- **Hero destacado** del servicio especial rediseñado (badge dorado Crown, gradiente animado, sparkles, imagen con glow).

### Base de datos
Script SQL idempotente: `backend/migrations/v2_1_chat_quotations_neon.sql` — crea las tablas, añade campos de perfil al user, repara `service_id` si se creó mal como UUID.

## Bugs encontrados y resueltos durante el ship

| # | Bug | Síntoma | Fix |
|---|---|---|---|
| 1 | `metadata = Column(JSON)` | `InvalidRequestError: Attribute name 'metadata' is reserved` al arrancar | Renombrar atributo ORM a `message_metadata` manteniendo columna SQL como `metadata` |
| 2 | FK `service_id UUID` contra `service_catalog.id INTEGER` | `CREATE TABLE` falló silenciosamente en Neon | Cambiar a `INTEGER` + script de reparación |
| 3 | `Field(..., decimal_places=2)` en Pydantic v2 | `ValueError: Unknown constraint decimal_places` → uvicorn no levanta → healthcheck Railway falla | Quitar constraint; DB enforza `DECIMAL(12,2)` |
| 4 | Router no registrado en `main.py` | Endpoints `/chat-quotations/*` devolvían 404 | `app.include_router(chat_quotation.router, ...)` |
| 5 | Endpoint `/corporate-services-public` requería auth pese al nombre | Cascadas de 401 → el interceptor de axios borraba el token → colapsaban todas las secciones del dashboard | Remover `get_current_user` del dependency |
| 6 | Multi-click en botón Enviar del chat | Creaba mensajes duplicados | Estado `sending` + guard en `handleSend` + Enter + respuesta optimista |
| 7 | User model sin `quotation_threads` back_populates | Relación rota en mapper | Añadir `relationship(back_populates="client", cascade="all, delete-orphan")` |

## Trade-offs y limitaciones conocidas

- **Polling de 8-10s** en vez de WebSocket/SSE — simple y estable, pero la latencia percibida depende del tick. Next step: WebSocket si el uso despega.
- **Railway en Singapur** — ~350ms RTT desde LATAM. Cada carga/polling amplifica la lentitud. Mover a `us-east4` es la palanca de mayor ROI.
- **Sin cache cliente** — cada cambio de sección refetches todo. Integrar React Query/SWR mejoraría la UX sin tocar backend.
- **Polling no tiene backoff** — si el servidor está caído, sigue pegándole cada 10s. Podríamos pausar al 5xx repetido.

## Próximos pasos sugeridos

1. **Reubicar Railway a `us-east4` / `us-east-1`** — cero código, 3-4x más rápido para LATAM.
2. **`@tanstack/react-query` en las secciones del dashboard** — stale-while-revalidate evita reloads al cambiar de tab.
3. **WebSocket para chat** — mensajes instantáneos; reemplaza el polling.
4. **Notificaciones push o email** cuando admin responde (para casos de chat cerrado).
5. **Exportar hilo como PDF** cuando se cierra la cotización (archivo formal de acuerdo).
