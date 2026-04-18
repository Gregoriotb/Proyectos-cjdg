# V2.2 — Dashboard Home (Hub de Inicio del Cliente)

**Estado:** 📋 Planificada (pendiente de implementar)
**Basado en:** `feat/*.md` (9 specs del 2026-04-17)

## Objetivo

Reemplazar la actual `OverviewSection` (vista "Panel General" del cliente, muy vacía) por un **Hub de Inicio** con:
- Landing corporativa (Acerca de CJDG + contacto de soporte)
- Widgets dinámicos: **Servicios Destacados** + **Ofertas Especiales**
- Navegación rápida a las demás secciones

## Auditoría — lo que ya existe vs. lo que falta

| Spec pide | Estado actual | Acción |
|---|---|---|
| Campo `CatalogItem.is_offer` | ✅ existe (`models/catalog.py`) | — |
| Campo `CatalogItem.discount_percentage` | ✅ existe | — |
| Campo `CatalogItem.is_available` | ✅ existe | — |
| Campo `ServiceCatalog.is_special` | ✅ existe | — |
| Endpoint `GET /catalog/offers` | ❌ NO existe | **CREAR** |
| Endpoint `GET /services/special` | ❌ NO existe | **CREAR** |
| `components/Client/Home/*` | ❌ NO existe | **CREAR 4 archivos** |
| `OverviewSection` reemplazado por `ClientHome` | ❌ pendiente | **REFACTOR** |
| Sidebar "Panel General" → "Inicio" con `Home` icon | ❌ pendiente | **MODIFICAR** |

## Correcciones al spec

El spec tenía algunos errores que hay que ajustar:

1. **`App.tsx` ruta `/dashboard` → ClientHome**
   No aplica. `ClientDashboard` ya está en `/dashboard` y usa **navegación por estado** (`activeSection`), no rutas. La acción correcta es: renderizar `<ClientHome />` cuando `activeSection === 'overview'`, reemplazando `OverviewSection`.

2. **`catalog_id: UUID` y `service_id: UUID` en schemas**
   Tanto `CatalogItem.id` como `Service.id` son `INTEGER` (no UUID). Los schemas Pydantic deben usar `int`.

3. **`service.marca` en `ProductOfferResponse`**
   El `Service` (catálogo físico) sí tiene `marca` — OK, se incluye tal cual.

4. **`PanelGeneral.tsx` no existe como archivo separado**
   La vista actual es un componente interno `OverviewSection` dentro de `ClientDashboard.tsx`. Crearemos `ClientHome.tsx` como archivo nuevo y dejamos `OverviewSection` intacto si se quiere, pero el dashboard renderizará `ClientHome` en su lugar.

## Archivos a tocar

### Backend (2 archivos + 1 schema)

| Archivo | Acción |
|---|---|
| `backend/routes/catalog.py` | **MODIFICAR** — nuevo endpoint `GET /offers?limit=6` |
| `backend/routes/service_quotations.py` | **MODIFICAR** — nuevo endpoint `GET /services/special` |
| `backend/schemas/catalog.py` o inline | `ProductOfferResponse` + `SpecialServiceResponse` |

### Frontend (5 archivos nuevos + 1 modificación)

| Archivo | Acción |
|---|---|
| `frontend/src/components/Client/Home/ClientHome.tsx` | **CREAR** — orquesta los widgets |
| `frontend/src/components/Client/Home/HeroSection.tsx` | **CREAR** — landing corporativa |
| `frontend/src/components/Client/Home/SpecialServicesWidget.tsx` | **CREAR** — 3 cards de servicios destacados |
| `frontend/src/components/Client/Home/OffersWidget.tsx` | **CREAR** — grid/carrusel de ofertas |
| `frontend/src/components/Client/Home/QuickAccessNav.tsx` | **CREAR** — 4 links a secciones |
| `frontend/src/pages/Dashboard/ClientDashboard.tsx` | **MODIFICAR** — sidebar label + icon + render ClientHome |

## Endpoints nuevos (especificación)

### `GET /api/v1/catalog/offers?limit=6`
**Público.** Retorna productos físicos en oferta ordenados por mayor descuento.

```python
# routes/catalog.py
@router.get("/offers", response_model=List[ProductOfferResponse])
def get_active_offers(limit: int = 6, db: Session = Depends(get_db)):
    rows = (
        db.query(CatalogItem, Service)
          .join(Service, CatalogItem.service_id == Service.id)
          .filter(CatalogItem.is_offer == True, CatalogItem.is_available == True)
          .order_by(CatalogItem.discount_percentage.desc())
          .limit(limit).all()
    )
    return [
        ProductOfferResponse(
            catalog_id=item.id,
            product_name=svc.nombre,
            brand=svc.marca,
            original_price=item.price,
            discount_percentage=float(item.discount_percentage or 0),
            final_price=float(item.price) * (1 - float(item.discount_percentage or 0) / 100),
            stock=item.stock,
            image_urls=svc.image_urls or [],
            service_id=svc.id,
        )
        for item, svc in rows
    ]
```

```python
class ProductOfferResponse(BaseModel):
    catalog_id: int
    product_name: str
    brand: Optional[str] = None
    original_price: Decimal
    discount_percentage: float
    final_price: float
    stock: int
    image_urls: List[str] = []
    service_id: int
```

### `GET /api/v1/services/special`
**Público.** Retorna hasta 3 servicios corporativos destacados.

```python
# routes/service_quotations.py (al lado de corporate-services-public)
@router.get("/services/special", response_model=List[SpecialServiceResponse])
def get_special_services(db: Session = Depends(get_db)):
    return (
        db.query(ServiceCatalog)
          .filter(ServiceCatalog.is_special == True, ServiceCatalog.activo == True)
          .order_by(ServiceCatalog.created_at.desc())
          .limit(3).all()
    )
```

```python
class SpecialServiceResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    pilar: str
    image_urls: List[str] = []
    is_special: bool
    class Config: from_attributes = True
```

## Diseño del Home (resumen)

```
┌──────────────────────────────────────────────────────────┐
│ HeroSection — Acerca de CJDG + CTAs "Ver Catálogo"       │
│                                  / "Solicitar Cotización"│
├──────────────────────────────────┬───────────────────────┤
│ SoporteCard                      │ SpecialServicesWidget │
│ 📞 ventas@proyectoscjdg.com      │ 🎯 3 cards destacados │
│ +58 212-2350938                  │    con hover + CTA    │
│ +58 414-2849979                  │                       │
├──────────────────────────────────┴───────────────────────┤
│ OffersWidget — 🔥 ofertas con badge de descuento          │
│ (grid/carrusel, click → add to cart o detalle)           │
├───────────────────────────────────────────────────────────┤
│ QuickAccessNav — Catálogo | Servicios | Cotizs | Facturas│
└───────────────────────────────────────────────────────────┘
```

## Reglas de oro (del spec)

1. La raíz `/dashboard` (sección `overview`) renderiza `ClientHome`.
2. Usar paleta existente: `slate-950` bg, `blue-500/600` accents, `emerald` para ofertas.
3. Tipado estricto: `SpecialServiceType`, `OfferProductType`.
4. **Loading skeleton** para cada widget (que no haya saltos visuales).
5. **Fallback empty-state**: "No hay ofertas activas" en vez de widget vacío.
6. Datos de soporte **estáticos** por ahora (no endpoint):
   - Email: `ventas@proyectoscjdg.com`
   - Teléfonos: `+58 212-2350938`, `+58 414-2849979`

## Próximos pasos

1. Implementar backend (2 endpoints + schemas).
2. Smoke-test endpoints contra Neon.
3. Crear los 5 componentes frontend con loading states + fallbacks.
4. Refactorizar `ClientDashboard` (sidebar + render `ClientHome`).
5. Probar en local antes de pushear.
