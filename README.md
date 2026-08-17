# SIMTRG — Sistema de Monitoreo Táctico

**29 BIM · GMREC (Grupo de Monitoreo y Reconocimiento Electrónico Conjunto)**

Esta guía explica, paso a paso, cómo instalar y ejecutar SIMTRG en una computadora de la unidad. Está pensada para que **cualquier persona pueda seguirla**, incluso sin experiencia previa en programación.

> **Desarrollado por:** Mashi - Wilo · **Powered by:** Sanchez

---

## ¿Qué es SIMTRG?

Un sistema para registrar y consultar fotos de dron y eventos tácticos con su ubicación geográfica (GPS), pensado para trabajar de forma **local** (sin depender de internet ni de servicios externos), con un mapa de calor, línea de tiempo de eventos y un panel de control (dashboard) con estadísticas.

El sistema tiene dos partes que trabajan juntas:

| Parte | Qué hace | Tecnología |
|---|---|---|
| **Backend** (`simtrg-backend/`) | Guarda los datos, procesa las fotos, aplica la seguridad y los permisos | NestJS + PostgreSQL (corre en Docker) |
| **Frontend** (`simtrg-frontend/`) | La página web que se usa desde el navegador | React (corre con Node.js) |

---

## 1. Requisitos previos

Antes de empezar, instala estos dos programas en la computadora donde correrá el sistema:

### a) Docker Desktop
Se usa para levantar la base de datos y el backend sin instalar nada más.

- Windows / Mac: descargar e instalar **Docker Desktop** desde [docker.com](https://www.docker.com/products/docker-desktop/) y abrirlo (debe quedar corriendo en segundo plano, con el ícono de la ballena en la barra de tareas).
- Linux: instalar `docker` y el plugin `docker compose` según la distribución (ej. `sudo apt install docker.io docker-compose-plugin`).

Para confirmar que quedó bien instalado, abrir una terminal (CMD, PowerShell o Terminal) y escribir:
```bash
docker --version
docker compose version
```
Si ambos comandos muestran un número de versión, está listo.

### b) Node.js
Se usa para correr la parte visual (frontend).

- Descargar la versión **LTS** desde [nodejs.org](https://nodejs.org/) e instalar con las opciones por defecto.
- Confirmar la instalación:
```bash
node --version
npm --version
```

### c) Git (opcional, solo si se descarga el proyecto desde GitHub)
- Descargar desde [git-scm.com](https://git-scm.com/downloads).

---

## 2. Descargar el proyecto

**Opción A — con Git (recomendado):**
```bash
git clone https://github.com/WilmerBuestan/fotos_gps_simtrg.git
cd fotos_gps_simtrg
```

**Opción B — sin Git:**
Descargar el proyecto como archivo `.zip` desde GitHub (botón verde "Code" → "Download ZIP"), descomprimirlo en una carpeta, y abrir una terminal dentro de esa carpeta.

---

## 3. Configurar las variables de entorno (backend)

Dentro de la carpeta `simtrg-backend/` hay un archivo de ejemplo llamado `.env.example`. Hay que copiarlo y renombrarlo a `.env`:

```bash
cd simtrg-backend
cp .env.example .env      # En Windows (PowerShell): copy .env.example .env
```

El archivo `.env` ya trae valores por defecto que **funcionan de inmediato** para pruebas locales. No es obligatorio cambiar nada para arrancar el sistema, pero **antes de usarlo en un despliegue real** se recomienda cambiar al menos:

- `JWT_SECRET` → reemplazar por un texto largo y aleatorio (es la clave que firma las sesiones).
- `DB_PASSWORD` → una contraseña propia para la base de datos.

---

## 4. Levantar el backend y la base de datos (Docker)

Desde la carpeta `simtrg-backend/`:

```bash
docker compose up -d --build
```

Esto descarga las imágenes necesarias, compila el backend y deja dos contenedores corriendo:
- `simtrg_postgres` → la base de datos.
- `simtrg_backend` → la API del sistema (disponible en `http://localhost:3000`).

La primera vez puede tardar unos minutos. Para confirmar que todo quedó bien:

```bash
docker ps
```

Deben aparecer ambos contenedores como `Up`. También se puede revisar en el navegador:
- API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- Documentación Swagger: [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs)

> El sistema crea automáticamente un usuario administrador la primera vez que arranca (ver sección 6).

---

## 5. Levantar el frontend (la página web)

En **otra terminal**, ir a la carpeta `simtrg-frontend/`:

```bash
cd simtrg-frontend
npm install
npm run dev
```

Cuando termine, la terminal mostrará una dirección como:
```
➜  Local:   http://localhost:5173/
```

Abrir esa dirección en el navegador (Chrome o Edge recomendado). Ahí aparecerá la pantalla de inicio de sesión de SIMTRG.

> **Importante:** mientras se esté usando el sistema, **ambas terminales deben permanecer abiertas** (la de Docker y la de `npm run dev`). Si se cierran, el sistema deja de estar disponible hasta que se vuelvan a ejecutar.

---

## 6. Primer inicio de sesión

Usuario y contraseña por defecto (creados automáticamente al primer arranque):

```
Usuario:    admin.simtrg
Contraseña: Admin@Simtrg2024
```

**Se recomienda fuertemente crear un nuevo usuario administrador con contraseña propia y dejar de usar esta cuenta por defecto**, especialmente si la computadora tendrá acceso desde otros equipos de la red.

Desde el sistema, un Administrador puede crear cuentas para Operadores y Supervisores en la sección **Usuarios**.

---

## 7. Uso diario (después de la primera instalación)

No hace falta repetir todos los pasos anteriores cada vez. Solo:

1. Abrir Docker Desktop (esperar a que el ícono indique que está corriendo).
2. En una terminal, dentro de `simtrg-backend/`:
   ```bash
   docker compose up -d
   ```
3. En otra terminal, dentro de `simtrg-frontend/`:
   ```bash
   npm run dev
   ```
4. Entrar a `http://localhost:5173` desde el navegador.

Para **apagar todo** al terminar:
```bash
docker compose down       # dentro de simtrg-backend/
```
y cerrar la terminal del frontend (Ctrl+C).

Los datos (fotos, eventos, usuarios) **no se pierden** al apagar — quedan guardados en Docker y vuelven a aparecer al levantar el sistema de nuevo.

---

## 8. Problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| `docker: command not found` | Docker Desktop no está instalado o no está abierto | Instalar/abrir Docker Desktop y esperar a que inicie por completo |
| La página no carga en `localhost:5173` | El frontend no está corriendo | Verificar que la terminal con `npm run dev` siga abierta y sin errores |
| Error al iniciar sesión / "Network Error" | El backend no está corriendo | Verificar con `docker ps` que `simtrg_backend` esté `Up`; si no, correr `docker compose up -d` de nuevo dentro de `simtrg-backend/` |
| La app carga pero se queda "en blanco" o parpadeando | Sesión guardada vencida de un uso anterior | Ya corregido: el sistema ahora detecta sesiones vencidas y regresa automáticamente a la pantalla de inicio de sesión |
| Puerto 3000 o 5433 ya en uso | Otro programa está usando ese puerto | Cerrar el programa que lo esté usando, o cambiar el puerto en `docker-compose.yml` |

---

## 9. Documentación adicional

- [`simtrg-backend/README.md`](simtrg-backend/README.md) — detalle técnico del backend (arquitectura, roles y permisos, seguridad).
- [`DOCUMENTACION_TECNICA.md`](DOCUMENTACION_TECNICA.md) — tecnologías usadas, opciones de hosting y hoja de ruta hacia machine learning.
