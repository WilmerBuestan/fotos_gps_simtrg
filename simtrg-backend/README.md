# SIMTRG - Backend API
**Sistema Integrado de Monitoreo Táctico y Reconocimiento Geoespacial**  
*29 BIM - Grupo de Monitoreo y Reconocimiento Electrónico Conjunto (GMREC)*

---

## Arquitectura

```
src/
├── core/                          ← NÚCLEO (sin dependencias externas)
│   ├── domain/
│   │   ├── entities/              ← Entidades de negocio puras
│   │   │   └── usuario.entity.ts
│   │   ├── repositories/          ← Puertos (interfaces/contratos)
│   │   │   └── usuario.repository.ts
│   │   └── exceptions/            ← Excepciones semánticas del negocio
│   │       └── domain.exceptions.ts
│   └── use-cases/                 ← Lógica de aplicación
│       ├── auth/
│       │   └── login.use-case.ts
│       └── users/
│           ├── crear-usuario.use-case.ts
│           └── obtener-usuarios.use-case.ts
│
├── infrastructure/                ← ADAPTADORES (implementaciones)
│   ├── database/
│   │   ├── entities/              ← Entidades TypeORM (ORM)
│   │   ├── repositories/          ← Implementaciones de los puertos
│   │   └── migrations/            ← Migraciones de BD
│   ├── http/
│   │   ├── controllers/           ← Endpoints REST
│   │   ├── guards/                ← JWT + RBAC
│   │   ├── interceptors/          ← Auditoría (Mini-SIEM)
│   │   ├── filters/               ← Mapeo de excepciones a HTTP
│   │   ├── decorators/            ← @Roles, @UsuarioActual
│   │   └── modules/               ← Módulos NestJS
│   └── config/                    ← Configuración TypeORM CLI
│
└── shared/                        ← Tipos y constantes compartidos
    ├── types/
    └── constants/
```

## RBAC - Roles y Permisos

| Endpoint | OPERADOR | SUPERVISOR | ADMINISTRADOR |
|---|:---:|:---:|:---:|
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `GET /auth/perfil` | ✅ | ✅ | ✅ |
| `POST /usuarios` | ❌ | ❌ | ✅ |
| `GET /usuarios` | ❌ | ❌ | ✅ |
| `GET /usuarios/:id` | ❌ | ❌ | ✅ |
| `GET /usuarios/mi-perfil-completo` | ✅ | ✅ | ✅ |

## Setup Rápido

### 1. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con valores reales, especialmente JWT_SECRET y contraseñas
```

### 2. Generar hash de contraseña inicial
```bash
node -e "const b=require('bcrypt'); b.hash('TuContraseñaSegura',12).then(console.log)"
# Pegar el hash en scripts/init-postgis.sql
```

### 3. Levantar con Docker Compose
```bash
docker-compose up -d --build
```

### 4. Verificar
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs

### Desarrollo local (sin Docker)
```bash
npm install
cp .env.example .env  # Ajustar DB_HOST=localhost
npm run start:dev
```

### Migraciones
```bash
# Generar migración tras cambios en entidades
npm run migration:generate -- src/infrastructure/database/migrations/NombreMigracion

# Aplicar migraciones
npm run migration:run
```

## Seguridad Implementada

| Control | Implementación |
|---|---|
| Autenticación | JWT (8h expiración) + Bcrypt (salt 12) |
| Autorización | RBAC con Guards de NestJS |
| Anti-DoS | ThrottlerModule (100 req/min/IP) |
| Anti-XSS | Helmet (cabeceras HTTP seguras) |
| Anti-SQLi | TypeORM con consultas parametrizadas |
| Auditoría | AuditoriaInterceptor (Mini-SIEM) |
| Zero Trust | Contenedor no-root + red Docker aislada |
