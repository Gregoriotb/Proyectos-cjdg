# Estructura de Subcontexto (Catálogos Masivos PDF)

**Objetivo:** Convertir el contenido denso de listas de precios y catálogos en PDF (`Catalogos/`) en una interfaz de alto impacto, fluida y escalable.

**Subcontexto Activo:** `[CONTEXT: CATALOG_PDF_SYNC]`
**Skill Asignado:** Frontend Product Engineer & UI/UX Designer

## 1. El Problema a Resolver
El "Ancla de Verdad" inicial asume 4 pilares generales, pero los documentos en la carpeta `Catalogos/` (como *CAT CCTV PR CJDG.pdf*, *Lista SIEMON Pr CJDG.pdf*, *Cat UBIQUITI PrCJDG.pdf*, etc.) contienen miles de referencias, SKU, descripciones técnicas y precios de equipos de redes, servidores y seguridad.

## 2. Abordaje Técnico en Fase 5
Para que el Frontend y Backend puedan manejar esto sin colapsar, se requiere la siguiente lógica de interacción:

- **Data Mapping (Backend → Frontend):**
  Un script interno (a futuro) o un seed avanzado deberá barrer los PDFs y poblar la tabla `CatalogItem` en la base de datos de PostgreSQL. Todo lo de UBIQUITI y SIEMON se asignará al pilar `Tecnología` → Categoría `Redes`/`Seguridad`.

- **Componente: `CatalogGrid.tsx` (Frontend):**
  Dado que el array JSON podría tener cientos de objetos (por ejemplo, todos los modelos de cámaras CCTV), el grid utilizará **Lazy Loading / Virtualization** o paginación.
  
- **Componente: `ServiceCard.tsx` (Frontend):**
  Debe adoptar el aspecto *Executive Dark / Glassmorphism*:
  - Tipografía técnica (Inter o Roboto Mono) para poder leer bien el *Modelo* y *SKU*.
  - Efectos visuales de blur/fondo translúcido para no sobrecargar el grid.
  - Botón minimalista de `[+] Cotizar` para enviar inmediatamente el equipo al Componente `CartDrawer.tsx`.

## 3. Instrucciones para la IA (System Prompt de Fase 5)
Cuando se trabaje en esta vista, la orden es:
> `"IA, estamos en [CONTEXT: CATALOG_PDF_SYNC] + [SKILL: DESIGN]. Asume que el endpoint /catalog devolverá cientos de equipos técnicos (Switches, Cámaras, etc.). Diseña las tarjetas (Cards) optimizadas para descripciones largas, con estética Glassmorphism corporativa, e implementa paginación o scroll infinito."`
