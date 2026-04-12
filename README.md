# Proyectos CJDG — Ecosistema Digital

> *"Cuatro disciplinas, Una sola solución"*

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Gateway | Nginx (Reverse Proxy, Puerto 80) |
| Backend | Python 3.11 · FastAPI · PostgreSQL 15 · Alembic · Pydantic v2 |
| Frontend | React 18 · Vite · Tailwind CSS |
| Deploy | Docker Compose |

---

## Levantar el Proyecto

### Requisitos previos
- Docker >= 24.0
- Docker Compose >= 2.0

### Arranque completo (todos los servicios)
```bash
docker-compose up --build
```

### Accesos
| Servicio | URL |
|---|---|
| Sitio web (Frontend) | http://localhost |
| API Docs (Swagger) | http://localhost/api/v1/docs |
| API ReDoc | http://localhost/api/v1/redoc |

---

## Migraciones de Base de Datos (Alembic)

> **Regla:** Todo cambio en la DB debe pasar por una migración. No se permiten cambios manuales.

```bash
# Entrar al contenedor del backend
docker-compose exec backend bash

# Crear nueva migración
alembic revision --autogenerate -m "descripcion_del_cambio"

# Aplicar migraciones pendientes
alembic upgrade head

# Revertir última migración
alembic downgrade -1
```

---

## Estructura del Proyecto

```
proyectos-cjdg/
├── docker-compose.yml
├── gateway/            → Nginx Reverse Proxy
├── backend/            → Python / FastAPI
│   ├── models/         → SQLAlchemy (tablas)
│   ├── schemas/        → Pydantic (validación)
│   ├── routes/         → Endpoints por subcontexto
│   └── migrations/     → Alembic
├── frontend/           → React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/      → Landing, Login, Dashboard, Catalog, Cart, Admin
│       ├── components/ → CatalogEngine, Cart, Quotation, Admin
│       ├── services/   → Axios → Gateway
│       └── context/    → AuthContext, CartContext
└── docs/
    └── brochure_knowledge.json  ← Ancla de Verdad
```

---

## Los 4 Pilares

| Pilar | Servicios |
|---|---|
| 🖥️ Tecnología | Redes, Seguridad CCTV, Control de Acceso |
| ❄️ Climatización | Aires Acondicionados, Sistemas de Precisión |
| ⚡ Energía | Plantas Eléctricas, Energía Solar |
| 🏗️ Ingeniería Civil | Construcción, Remodelaciones, Consultoría |

---

## Variables de Entorno

Crear un archivo `.env` en la raíz (nunca subir al repositorio):

```env
DATABASE_URL=postgresql://cjdg_user:cjdg_password@db:5432/cjdg_db
SECRET_KEY=tu_clave_secreta_muy_larga_aqui
ENVIRONMENT=development
```
