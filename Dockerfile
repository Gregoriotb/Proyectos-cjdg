# ============================================================
# Proyectos CJDG — Dockerfile Produccion
# SC-DEPLOY-002 — Railway detecta este archivo automaticamente
# ============================================================

FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar codigo del backend
COPY backend/ .

# Directorio para archivos estaticos
RUN mkdir -p /app/static

# Puerto dinamico (Railway asigna $PORT)
EXPOSE ${PORT:-8000}

# Arranque produccion
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --log-level info
