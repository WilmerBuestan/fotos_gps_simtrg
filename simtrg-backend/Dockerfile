# ============================================================
# DOCKERFILE - SIMTRG Backend (NestJS)
# Multi-stage build: reduce imagen final a ~200MB
# ============================================================

# ---- ETAPA 1: Builder ----
FROM node:20-bookworm-slim AS builder

# Instalar dependencias del sistema necesarias para bcrypt

WORKDIR /app

# Copiar manifiestos de dependencias primero (cache de capas)
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para build)
RUN npm install

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# ---- ETAPA 2: Production ----
FROM node:20-alpine AS production

# Metadatos de la imagen
LABEL maintainer="29 BIM - GMREC"
LABEL sistema="SIMTRG"
LABEL version="1.0.0"

# Crear usuario no-root por seguridad (Zero Trust)
RUN addgroup -g 1001 -S simtrg && \
    adduser -S -u 1001 -G simtrg simtrg

WORKDIR /app

# Copiar manifiestos y solo instalar dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force


# Copiar artefacto compilado desde el builder
COPY --from=builder /app/dist ./dist

# Crear directorio para uploads con permisos correctos
RUN mkdir -p /app/uploads && chown -R simtrg:simtrg /app

# Cambiar al usuario no-root
USER simtrg

# Puerto de la aplicación
EXPOSE 3000

# Variables de entorno con valores por defecto seguros
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck para Docker/orquestadores
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Comando de inicio
CMD ["node", "dist/main"]
