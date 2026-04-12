# ============================================================
# Gateway Dockerfile — Nginx Reverse Proxy
# ============================================================
FROM nginx:alpine

# Elimina config default de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia la config personalizada
COPY nginx.conf /etc/nginx/nginx.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
