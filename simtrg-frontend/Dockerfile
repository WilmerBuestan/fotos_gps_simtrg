# ============================================================
# DOCKERFILE - SIMTRG Frontend (React + Vite)
# Multi-stage build: compila los assets estáticos y los sirve
# con nginx, que además hace de proxy hacia el backend para que
# /api y /uploads sigan funcionando como rutas relativas (mismo
# comportamiento que el proxy de Vite en desarrollo).
# ============================================================

# ---- ETAPA 1: Builder ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- ETAPA 2: Production (nginx) ----
FROM nginx:1.27-alpine AS production

LABEL maintainer="29 BIM - GMREC"
LABEL sistema="SIMTRG"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
