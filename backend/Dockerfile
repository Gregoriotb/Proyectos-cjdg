# ============================================================
# Backend Dockerfile — Python / FastAPI
# ============================================================
FROM python:3.11-slim

# Directorio de trabajo
WORKDIR /app

# Dependencias del sistema (necesarias para psycopg2)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código fuente
COPY . .

# Puerto en el que corre FastAPI
EXPOSE 8000

# Comando de arranque con recarga automática en desarrollo
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
