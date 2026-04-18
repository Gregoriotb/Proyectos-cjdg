# Plan V3 — Rediseño Tech-Gray + Facturas en Chat

**Estado:** ✅ SHIPEADO 2026-04-18 (V2.3 en `e4af8b8` · V3.1 en `4439e8b` · V3.2+3.3 en `2496998`)
**Basado en:** `rediseno/.vscode/*.md` (9 specs) + nueva feature conversacional de facturas

Este plan combina **dos cambios** que van a correr en paralelo pero en fases separadas para no romper producción:

- **V3 Tech-Gray Redesign** — migración completa de paleta oscura (slate-950) a paleta tech-gris claro con azul de acento.
- **V2.3 Invoice Mentions** — permitir al cliente adjuntar una o varias de sus facturas a un mensaje del chat-cotización.

---

## Parte A — V3 Tech-Gray Redesign

### Principios (del spec)

1. Fondos claros (`#F8F9FA`), **nunca oscuros puros**.
2. Profundidad por **sombras sutiles**, no bordes duros.
3. Azul (`#0D6EFD`) **solo** para CTAs, estados activos y badges de éxito.
4. Grises para información, estructura y jerarquía.
5. Transiciones suaves (200-300ms) en interactuables.

### Tokens (nueva paleta)

```
--cj-bg-primary    #F8F9FA   Fondo principal (grisáceo claro)
--cj-bg-secondary  #E9ECEF   Cards elevadas
--cj-bg-tertiary   #DEE2E6   Hover / bordes suaves
--cj-surface       #FFFFFF   Modales, flotantes
--cj-text-primary  #212529   Texto principal
--cj-text-secondary#6C757D   Subtítulos
--cj-text-muted    #ADB5BD   Placeholders
--cj-accent-blue   #0D6EFD   CTAs, links, activo
--cj-accent-hover  #0B5ED7   Hover de CTA
--cj-accent-light  #E7F1FF   Badge bg, highlight
--cj-border        #CED4DA   Bordes estándar
```

### Estrategia de migración (fases)

El proyecto tiene ~30+ componentes usando la paleta actual (`slate-*`, `cjdg-*`). Migrar todo de golpe es arriesgado → **lo hacemos en 3 fases** coexistiendo ambas paletas hasta la fase final.

#### Fase 3.1 — Cimientos (sin cambio visual todavía)
- Agregar los tokens `cj-*` al `tailwind.config.js` **sin remover** los `cjdg-*` ni `slate-*`.
- Extender las sombras `cj-sm/md/lg/xl`.
- Crear `ThemeContext.tsx` (tema fijo `tech-light` hoy, extensible a toggle después).
- Crear carpeta `components/ui/` con primitivas:
  - `Button` (primary + secondary variants)
  - `Card`
  - `Input`
  - `Badge`
- **Criterio de éxito:** build pasa, nada se rompe visualmente (primitives aún no se usan).

#### Fase 3.2 — Re-skin de vistas del cliente
Rediseñar en orden de prioridad según spec:
1. `/dashboard` (ClientHome) — hero, widgets, sidebar claro.
2. `/dashboard/catalog` (ProductCatalogGrid) — cards con hover elevation.
3. `/dashboard/services` (ServiceBrowser) — pills grises, azul en activo.
4. `/dashboard/quotations` (chat) — burbujas blancas, acento azul propio del cliente.
5. Landing pública (`Landing.tsx`) — full redesign.

Sidebar del cliente (`ClientDashboard`):
- Fondo `#FFFFFF`, border `#E9ECEF`
- Item activo: bg `#E7F1FF` + text `#0D6EFD`
- Item hover: bg `#F8F9FA`

#### Fase 3.3 — Re-skin del admin + cleanup
- Admin panels (CatalogPanel, InvoicesPanel, etc.) con fondos claros.
- AdminChatPanel con la misma paleta (burbujas admin en azul acento, cliente en gris).
- Eliminar tokens `cjdg-*` y usos de `slate-*` del código.
- Actualizar `tailwind.config.js` final (solo `cj-*`).

### Anti-patrones a evitar
- ❌ Fondos oscuros (`#1a1a1a`, `slate-950`) en áreas principales.
- ❌ Bordes negros puros.
- ❌ Más de un color de acento (solo azul).
- ❌ Sombras con opacity > 0.15.

### Archivos a tocar (resumen)

| # | Archivo | Acción |
|---|---|---|
| 1 | `frontend/tailwind.config.js` | **MODIFICAR** — añadir tokens cj-* |
| 2 | `frontend/src/index.css` (o globals) | **MODIFICAR** — vars CSS |
| 3 | `frontend/src/context/ThemeContext.tsx` | **CREAR** |
| 4-7 | `frontend/src/components/ui/{Button,Card,Input,Badge}.tsx` | **CREAR** |
| 8 | `ClientDashboard.tsx` (sidebar) | **MODIFICAR** |
| 9 | `Admin.tsx` (layout + sidebar) | **MODIFICAR** |
| 10-15 | Home widgets, ProductCatalogGrid, ServiceBrowser, InvoiceList, ChatView/Panel | **MODIFICAR progresivo** |
| 16 | `Landing.tsx` | **REDISEÑAR** |

---

## Parte B — V2.3 Facturas en Chat

### Objetivo
El cliente puede, durante una conversación de cotización, **seleccionar una o varias facturas** de su historial y adjuntarlas al mensaje. El admin (y el cliente) verán una tarjeta inline con el resumen de cada factura referenciada.

### Decisiones de diseño

**¿Tabla nueva o reusar `message_metadata`?**
→ **Reusar `message_metadata`** (JSONB ya existente). Es simple y performante. Si mañana necesitamos queries tipo "¿qué mensajes mencionan la factura #42?", migramos a tabla puente.

**Identificador del tipo de mensaje:**
→ Nuevo valor `message_type = "invoice_mention"`. La tabla ya tiene ese campo en el CHECK constraint, pero `invoice_mention` no está incluido — hay que ampliarlo.

**Respuesta enriquecida:**
→ Backend embebe `invoices: List[InvoiceBrief]` en `ChatMessageResponse` cuando el mensaje es `invoice_mention`, haciendo el join al serializar. Frontend renderiza una tarjeta especial.

### Modelo de datos

**Ampliar el CHECK constraint de `message_type`**:

```sql
-- Neon SQL Editor (idempotente)
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text','file','image','budget_update','status_change','system','invoice_mention'));
```

Los `invoice_ids` van en `message_metadata`:
```json
{ "invoice_ids": [12, 34, 56] }
```

### Endpoints

**Cliente — enviar mensaje con facturas referenciadas**
Extender `POST /chat-quotations/threads/{id}/messages`:

```python
class ChatMessageCreate(BaseModel):
    content: str = Field("", max_length=4000)       # puede ir vacío si hay invoice_ids
    message_type: str = "text"
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None
    invoice_ids: Optional[List[int]] = None          # NUEVO

# Validación en el handler:
# - Si invoice_ids no vacío → forzar message_type = "invoice_mention"
# - Validar que cada invoice.user_id == current_user.id (cliente solo puede
#   referenciar facturas propias)
# - Guardar en message_metadata = {"invoice_ids": [...]}
# - content = content || f"Facturas referenciadas: #{', #'.join(str(i) for i in invoice_ids)}"
```

Admin también puede referenciar facturas del cliente del hilo (útil para generar una nueva factura y mencionarla en el chat):
- `POST /chat-quotations/admin/threads/{id}/messages` acepta el mismo campo `invoice_ids`.
- Validación admin: las facturas deben pertenecer al `thread.client_id`.

### Schema enriquecido

```python
class InvoiceBrief(BaseModel):
    id: int
    invoice_type: str                    # PRODUCT_SALE / SERVICE_QUOTATION
    status: str                          # PENDING / PAID / CANCELLED / OVERDUE
    total: Decimal
    notas: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class ChatMessageResponse(BaseModel):
    # ... campos existentes ...
    invoices: Optional[List[InvoiceBrief]] = None   # NUEVO, populado solo si invoice_mention
```

### Serializer

En `_serialize_message` del backend, detectar `invoice_mention` y hacer lookup:

```python
def _serialize_message(db, msg):
    invoices = None
    if msg.message_type == "invoice_mention":
        ids = (msg.message_metadata or {}).get("invoice_ids") or []
        if ids:
            rows = db.query(Invoice).filter(Invoice.id.in_(ids)).all()
            invoices = [InvoiceBrief.model_validate(r) for r in rows]
    return ChatMessageResponse(..., invoices=invoices, ...)
```

### Frontend

**Nuevo componente: `InvoiceSelectorModal.tsx`**
- Fetch de `GET /invoices` (ya existe)
- Lista checkboxeable agrupada por estado (Pendientes primero, luego Pagadas, etc.)
- Resumen abajo: "N facturas seleccionadas · Total: $X"
- Botones "Cancelar" / "Adjuntar (N)"

**Botón nuevo en el composer del chat cliente** (al lado del clip 📎):
- Icono `Receipt` de lucide
- Click → abre `InvoiceSelectorModal`

**Nueva burbuja de mensaje: `InvoiceMentionBubble.tsx`**
- Renderiza el texto base + una tarjeta por cada factura con:
  - `#{id}` · `{tipo}` · badge de estado
  - Total en grande
  - Fecha de creación
  - Link "Ver detalle →" que abre la factura en modal o lleva a la sección Facturas

**AdminChatPanel** también obtiene el botón y render — el admin puede ver las facturas del cliente (usa mismo endpoint `/invoices/all` filtrado por cliente del hilo o el backend ya resuelve por `thread.client_id`).

### Archivos a tocar

**Backend (3):**
| # | Archivo | Acción |
|---|---|---|
| 1 | `backend/schemas/chat_quotation.py` | **MODIFICAR** — `InvoiceBrief` + campo `invoices` + `invoice_ids` en Create |
| 2 | `backend/routes/chat_quotation.py` | **MODIFICAR** — validación + serializer + invoice_mention |
| 3 | `backend/migrations/v2_3_invoice_mention_check.sql` | **CREAR** — ampliar CHECK constraint |

**Frontend (4 + 2 mod):**
| # | Archivo | Acción |
|---|---|---|
| 1 | `components/Client/Quotations/InvoiceSelectorModal.tsx` | **CREAR** |
| 2 | `components/Client/Quotations/InvoiceMentionBubble.tsx` | **CREAR** |
| 3 | `components/Client/Quotations/ClientChatView.tsx` | **MODIFICAR** — botón + modal + render |
| 4 | `components/Admin/Quotation/AdminChatPanel.tsx` | **MODIFICAR** — mismo botón + render |

---

## Orden de implementación sugerido

Dado que el rediseño V3 es invasivo y la feature de facturas es puntual, propongo:

1. **Primero V2.3 Invoice Mentions** (1 commit backend + 1 SQL + 1 commit frontend) — aporta valor inmediato al usuario sin tocar UI masivamente.
2. **Luego Fase 3.1** — cimientos del sistema de diseño (invisible hasta que se usen).
3. **Fase 3.2** progresiva, componente por componente, empezando por ClientHome/Dashboard.
4. **Fase 3.3** — admin + cleanup final.

De esta forma el usuario ve ganancia concreta ya (facturas en chat) y el rediseño puede avanzar en iteraciones seguras sin deployes rojos.

---

## Consideraciones

- **Chat cerrado**: la feature de referenciar facturas debe respetar la regla existente de no permitir mensajes en hilos `closed/cancelled`.
- **Privacidad**: el cliente solo puede referenciar facturas donde `invoice.user_id == current_user.id`. Validar siempre.
- **Persistencia del metadata**: al borrarse una factura (si llegamos a soportar esto), el `invoice_ids` del metadata queda huérfano. El serializer debe manejar el caso (fetch devuelve lista más corta que los ids).
- **Emoji/iconografía**: en V3 el chat usará azul como acento del cliente y gris-azul del admin, evitando el gradiente morado actual.
