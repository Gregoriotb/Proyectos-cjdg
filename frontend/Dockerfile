# ============================================================
# Frontend Dockerfile — React 18 + Vite
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Instala dependencias primero (mejor uso del cache de Docker)
COPY package*.json ./
RUN npm install

# Copia el código fuente
COPY . .

EXPOSE 5173

# Modo desarrollo con HMR expuesto a Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
