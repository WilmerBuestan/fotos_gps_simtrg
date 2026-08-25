# Guía de despliegue — Servidor propio para SIMTRG

Esta guía es para ti, para cuando consigas la computadora que va a quedar prendida corriendo SIMTRG todo el tiempo en tu lugar de trabajo. Está escrita paso a paso asumiendo que nunca has hecho esto antes.

Ya lo probé de punta a punta en este mismo formato (Docker con 3 piezas: base de datos, backend y ahora también el frontend) antes de escribirte esto, así que los comandos de aquí son los reales que vas a usar.

---

## 1. Qué vas a construir (resumen en una imagen mental)

```
┌─────────────────────────────────────────────────────┐
│  La computadora que vas a pedir (Linux Server)       │
│                                                       │
│   ┌──────────┐   ┌──────────┐   ┌─────────────────┐ │
│   │ Frontend │   │ Backend  │   │ Base de datos    │ │
│   │ (React)  │──▶│ (NestJS) │──▶│ (PostgreSQL)     │ │
│   │ puerto 80│   │puerto3000│   │ puerto 5433      │ │
│   └──────────┘   └──────────┘   └─────────────────┘ │
│         Todo esto corre en Docker, en 3 "cajitas"    │
│         separadas que ya vienen armadas.             │
└─────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
   Cualquier navegador            El módulo ESP32
   en la misma red                (RFID) también
   (celular, laptop)              en la misma red
```

Tú **no vas a instalar** Node, Postgres, ni nada de eso a mano. Solo instalas **Docker**, copias el proyecto, y Docker arma las 3 cajitas solo. Eso es lo bueno de que ya esté "dockerizado".

**Ya subí todo el trabajo de esta sesión a tu GitHub** (`WilmerBuestan/fotos_gps_simtrg`, rama `main`) — el `git clone` del paso 9 va a traer la versión completa, con Gestor de Drones, perfiles, y el Docker del frontend incluidos.

### ¿Por qué el frontend también en Docker, sin interfaz gráfica?

Tenías razón en desconfiar de esa parte — antes de esta sesión el frontend **no** estaba preparado para producción, solo corría con `npm run dev` (el modo de desarrollo, pensado para tu laptop mientras programas, no para dejarlo prendido solo). Evalué 3 formas de resolverlo:

| Opción | Cómo funciona | Por qué sí/no |
|---|---|---|
| Seguir con `npm run dev` en el servidor | Dejar corriendo el modo desarrollo con un gestor de procesos (pm2, systemd) | ❌ No es para esto: más lento, usa más memoria, no está pensado para quedarse prendido meses. |
| Servir los archivos con un programa simple (ej. `serve`) | `npm run build` + un paquete liviano que sirve los archivos | ⚠️ Funciona, pero no sabe redirigir `/api` y `/uploads` al backend — tocaría reescribir esas rutas en el código. |
| **Docker + nginx (lo que implementé)** | `npm run build` empaquetado dentro de una imagen Docker con nginx, que sirve los archivos y reenvía `/api`/`/uploads` al backend | ✅ Es exactamente lo que ya usan `backend` y `postgres` — mismo patrón, mismo comando (`docker compose up`), sin instalar nada aparte, sin interfaz gráfica (nginx es un servidor web, no un programa con ventanas). |

Elegí la tercera porque es la que menos piezas nuevas te obliga a aprender: **todo el sistema se maneja con los mismos 2-3 comandos de Docker**, sin mezclar herramientas distintas para cada pedazo. Ya lo armé, lo probé de punta a punta, y funciona — lo que sigue en esta guía ya lo verificado.

---

## 2. Qué computadora pedir

No necesitas nada exagerado — esto es un sistema interno para una unidad, no una plataforma masiva. Pide algo con estas características mínimas:

| Componente | Mínimo aceptable | Recomendado |
|---|---|---|
| Procesador | 2 núcleos | **4 núcleos** |
| Memoria RAM | 4 GB | **8 GB** (16 GB si consigues) |
| Disco duro | 250 GB | **1 TB** (ver sección 3, tu instinto de 1TB está bien) |
| Tipo de disco | HDD funciona | **SSD** si es posible (todo va mucho más rápido y fluido) |
| Red | Cable de red (Ethernet) a tu router/switch | Igual — evita WiFi para el servidor si puedes |

Si la computadora que "no se usa" cumple esto o más, sirve perfecto. No hace falta comprar nada nuevo.

---

## 3. ¿1 TB o cuánto? — el razonamiento

Lo que ocupa espacio en este sistema:

- **El sistema operativo (Ubuntu Server)**: ~10-15 GB.
- **Docker y las 3 imágenes**: ~3 GB.
- **La base de datos** (usuarios, drones, préstamos, logs, eventos): esto es solo texto y números, crece muy lento — incluso con años de uso pesado, probablemente no pase de unos pocos GB.
- **Las fotos subidas** (esto es lo que realmente ocupa espacio): cada foto ronda 3-5 MB. Si el sistema recibe, por decir, 50-100 fotos por día, eso es aproximadamente 5-15 GB al mes, es decir **60-180 GB por año** de uso activo.

Con eso en mente:
- **500 GB** te da margen cómodo para 2-3 años de uso activo.
- **1 TB** (tu idea) te da margen para **varios años** sin preocuparte, incluso si el uso de fotos aumenta. Es la opción segura y no es cara hoy en día.
- Si consigues **2 TB** sin mucho costo extra, mejor todavía — nunca sobra espacio en un sistema que acumula fotos indefinidamente.

**Conclusión: pide 1 TB.** Es la elección correcta para "dejarlo funcionando y no pensar en esto por años".

Un detalle importante: **los backups** (copias de seguridad, ver sección 8) deberían ir a un disco USB externo aparte, no al mismo disco del servidor — si el disco del servidor falla, quieres que la copia esté en otro lado físicamente.

---

## 4. Qué descargar/instalar (antes de empezar)

1. **Ubuntu Server LTS** (la versión "LTS" = soporte de largo plazo, la más estable). Descárgalo de:
   `https://ubuntu.com/download/server`
   Elige la versión LTS más reciente (24.04 o la que esté vigente cuando lo hagas).

2. **Balena Etcher** (para grabar el instalador en un USB) — gratis, para Windows/Mac/Linux:
   `https://etcher.balena.io/`

3. Un **USB vacío** de al menos 4 GB (se borra todo su contenido al grabar el instalador — guarda antes lo que tenga).

4. Un **cable de red** para conectar la computadora al router/switch de tu oficina.

5. (Opcional pero recomendado) Un **disco USB externo** para los backups — cualquier capacidad, 256 GB ya es bastante para esto.

No necesitas descargar Docker todavía — eso se instala después, ya con Ubuntu Server corriendo (paso 6).

---

## 5. Instalar Ubuntu Server

1. Abre Balena Etcher, selecciona el archivo `.iso` de Ubuntu Server que descargaste, selecciona el USB, y graba (botón "Flash").
2. Conecta el USB a la computadora que va a ser el servidor, y conecta también el cable de red.
3. Enciende la computadora y entra al menú de arranque (normalmente presionando `F12`, `F2`, `Esc` o `Del` al prender — varía según la marca; si no sabes cuál, busca "boot menu" + la marca de tu computadora).
4. Arranca desde el USB. Sigue el instalador:
   - Idioma: Español o Inglés, como prefieras.
   - Tipo de instalación: "Ubuntu Server" (no elijas "minimized" para tu primera vez, elige la normal).
   - Red: debería detectar el cable y asignarte una IP automáticamente — no toques nada aquí todavía, eso se ajusta en el paso 7.
   - Disco: usa todo el disco para Ubuntu (a menos que quieras dividirlo, pero no hace falta).
   - **Perfil de usuario**: crea un usuario y una contraseña — **anótalos en un lugar seguro**, los vas a necesitar siempre.
   - **"Install OpenSSH server"**: dile que SÍ (esto te va a permitir conectarte a este servidor desde tu propia computadora sin tener que estar físicamente ahí cada vez — muy útil).
   - El resto de opciones (snaps/paquetes extra): puedes saltarlas todas.
5. Cuando termine, reinicia y quita el USB cuando te lo pida.
6. Al reiniciar, vas a ver una pantalla de texto (no hay interfaz gráfica en "Server" — es normal, todo se maneja escribiendo comandos). Inicia sesión con el usuario/contraseña que creaste.

---

## 6. Conectarte al servidor desde tu propia computadora (para no estar tipeando ahí físicamente)

1. En la pantalla del servidor, escribe:
   ```bash
   ip addr
   ```
   Busca una línea que diga algo como `inet 10.101.27.XXX` — esa es la IP del servidor en tu red.

2. Desde tu propia computadora (con Docker/tu proyecto), abre una terminal y escribe:
   ```bash
   ssh tu_usuario@10.101.27.XXX
   ```
   (cambia `tu_usuario` y la IP por los tuyos). Te va a pedir la contraseña que creaste — desde aquí ya puedes seguir todos los pasos siguientes cómodamente desde tu propia pantalla, copiando y pegando los comandos.

---

## 7. Asignarle una IP fija al servidor

Igual que hablamos para el ESP32: si la IP del servidor cambia, todos (el navegador de los usuarios, el ESP32) dejan de encontrarlo. Dos formas de resolverlo, de más fácil a más robusta:

- **Reserva DHCP en el router** (recomendada): quien administre el router de tu oficina reserva esa misma IP siempre para la dirección física (MAC) de esta computadora. Para ver la MAC, en el servidor escribe `ip addr` y busca la línea `link/ether` junto a tu interfaz de red.
- **IP estática manual en Ubuntu**: más técnico, solo si no tienes acceso al router. Si llegas a necesitarlo, dime y te armo esa parte específica.

---

## 8. Instalar Docker

Ya conectado al servidor (por SSH o directo), copia y pega estos comandos uno por uno:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker (script oficial)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Permitir usar Docker sin escribir "sudo" cada vez
sudo usermod -aG docker $USER
```

Después de ese último comando, **cierra la sesión SSH y vuelve a entrar** (para que el permiso nuevo se aplique):
```bash
exit
```
y vuelve a conectarte con `ssh tu_usuario@IP`.

Confirma que Docker quedó instalado:
```bash
docker --version
docker compose version
```
Deberías ver números de versión en ambos, sin errores.

---

## 9. Copiar el proyecto al servidor

Tu proyecto ya está en GitHub, así que es así de simple:

```bash
sudo apt install -y git
git clone https://github.com/WilmerBuestan/fotos_gps_simtrg.git
cd fotos_gps_simtrg
```

(Si el repositorio es privado, te va a pedir usuario y una contraseña — GitHub ya no acepta tu contraseña normal ahí, necesitas un "Personal Access Token": lo generas en GitHub → tu foto de perfil → Settings → Developer settings → Personal access tokens → Generate new token, y lo usas como si fuera la contraseña. Si te trabas en esto, dime y lo resolvemos juntos.)

Alternativa si algún día no tienes el repositorio a mano: copiar la carpeta directo desde tu computadora al servidor (ejecuta esto desde TU computadora, no desde el servidor):
```bash
scp -r /ruta/a/Gmree tu_usuario@10.101.27.XXX:~/fotos_gps_simtrg
```

---

## 10. Configurar las variables de entorno de producción

Dentro de la carpeta `simtrg-backend/` del proyecto ya copiado, crea el archivo `.env` real (nunca se sube a git, así que hay que crearlo a mano en cada servidor nuevo):

```bash
cd simtrg-backend
cp .env.example .env
nano .env
```

Dentro del editor (`nano`), completa/cambia estos valores — **usa valores distintos a los que tenías en tu laptop de desarrollo**, este es el servidor real:

- `DB_PASSWORD`: pon una contraseña fuerte nueva.
- `JWT_SECRET`: genera una nueva ejecutando (en otra terminal) `openssl rand -hex 32` y pega el resultado aquí.
- `DRONES_DEVICE_API_KEY`: genera una nueva con `openssl rand -hex 24` — **esta es la que le vas a pasar a tu compañero para el ESP32, junto con la IP fija de este servidor**.
- `GEMINI_API_KEY`: tu clave de Google AI Studio (la misma que ya usabas, o una nueva si prefieres separar desarrollo de producción).

Guarda con `Ctrl+O`, Enter, y sal con `Ctrl+X`.

---

## 11. Levantar todo el sistema

Desde dentro de `simtrg-backend/` (donde está el `docker-compose.yml`):

```bash
docker compose up -d --build
```

Esto va a tardar varios minutos la primera vez (está construyendo las 3 imágenes). Al terminar, verifica que las 3 cajitas estén corriendo y "healthy" (saludables):

```bash
docker ps
```

Deberías ver algo como:
```
NAMES             STATUS
simtrg_frontend   Up ... (healthy)
simtrg_backend    Up ... (healthy)
simtrg_postgres   Up ... (healthy)
```

Si alguno dice `unhealthy` o se reinicia solo, revisa sus logs:
```bash
docker logs simtrg_backend --tail 50
docker logs simtrg_frontend --tail 50
```

---

## 12. Probar que funciona

Desde cualquier computadora o celular **conectado a la misma red** que el servidor, abre el navegador y entra a:

```
http://<IP_DEL_SERVIDOR>/
```
(sin puerto — el frontend ahora corre en el puerto 80, el normal de la web, así que no hace falta escribir `:3000` ni nada).

Deberías ver la pantalla de login de SIMTRG. Inicia sesión con tu usuario administrador de siempre y confirma que todo — Dashboard, Gestor de Drones, fotos — carga bien.

---

## 13. Avisarle a tu compañero (ESP32) los datos nuevos

Ahora que el sistema vive en un servidor propio (no en tu laptop), tu compañero necesita actualizar dos cosas en el ESP32:
- La **IP** — ahora la del servidor nuevo (fija, según el paso 7), no la de tu laptop.
- La **clave** `X-Device-Key` — la nueva que generaste en el paso 10 (si generaste una distinta a la que ya tenía).

El resto (formato del body, endpoint, etc.) sigue igual, ya documentado en `GUIA_INTEGRACION_ESP32_DRONES.md`.

---

## 14. Backups (copias de seguridad)

Esto es importante: si el disco del servidor falla algún día, quieres poder recuperar los datos. Un script simple que respalda la base de datos y las fotos:

1. Conecta el disco USB externo al servidor y monta (o simplemente copia a una carpeta ahí — Ubuntu normalmente lo monta solo en `/media/tu_usuario/...`).

2. Crea un script de backup:
   ```bash
   nano ~/backup-simtrg.sh
   ```
   Contenido:
   ```bash
   #!/bin/bash
   FECHA=$(date +%Y-%m-%d)
   DESTINO=/media/tu_usuario/TU_USB/backups-simtrg
   mkdir -p "$DESTINO"

   # Respaldo de la base de datos
   docker exec simtrg_postgres pg_dump -U simtrg_user simtrg_db > "$DESTINO/db-$FECHA.sql"

   # Respaldo de las fotos/uploads
   docker run --rm -v simtrg_uploads:/data -v "$DESTINO":/backup alpine tar czf /backup/uploads-$FECHA.tar.gz -C /data .

   # Borrar backups de más de 30 días para no llenar el USB
   find "$DESTINO" -name "*.sql" -mtime +30 -delete
   find "$DESTINO" -name "*.tar.gz" -mtime +30 -delete
   ```
   (ajusta `tu_usuario` y `TU_USB` a los reales).

3. Dale permiso de ejecución:
   ```bash
   chmod +x ~/backup-simtrg.sh
   ```

4. Prográmalo para que corra solo todos los días a las 2 AM:
   ```bash
   crontab -e
   ```
   Agrega esta línea al final del archivo:
   ```
   0 2 * * * /home/tu_usuario/backup-simtrg.sh
   ```
   Guarda y sal (si te pregunta qué editor usar, elige `nano`, la opción 1).

---

## 15. Cómo actualizar el sistema en el futuro

Cuando tú (o yo, ayudándote en una sesión futura) hagan cambios al código y quieras subir la versión nueva al servidor:

```bash
cd ~/fotos_gps_simtrg/simtrg-backend
git pull                          # trae los cambios nuevos
docker compose build backend frontend
docker compose up -d --force-recreate backend frontend
```
La base de datos (`postgres`) normalmente no hace falta reconstruirla — solo backend y frontend cuando cambia el código.

---

## 16. Seguridad básica (recomendado, no obligatorio para empezar)

- **Firewall**: activa `ufw` para que el servidor solo acepte conexiones en los puertos que realmente necesita:
  ```bash
  sudo ufw allow ssh
  sudo ufw allow 80
  sudo ufw enable
  ```
  (el puerto 3000 del backend y 5433 de la base de datos NO hace falta abrirlos al exterior — el frontend habla con el backend puertas adentro, dentro de Docker).
- **No expongas este servidor a Internet** — esto es un sistema para tu red interna/intranet, no debería ser alcanzable desde afuera de tu oficina.
- Guarda las contraseñas y claves del paso 10 en un lugar seguro (gestor de contraseñas o documento protegido), no en un papel a la vista.

---

## 17. Solución de problemas comunes

Es tu primera vez haciendo esto, así que es normal tropezar con algo. Antes de preocuparte, revisa esta lista:

**`docker compose up -d --build` falla o un contenedor no arranca**
```bash
docker compose logs backend --tail 100
docker compose logs frontend --tail 100
docker compose logs postgres --tail 100
```
El error casi siempre está en las últimas líneas. Cosas típicas:
- `"Error: connect ECONNREFUSED"` en el backend → la base de datos todavía no terminó de arrancar, espera 20-30 segundos y prueba `docker compose up -d` de nuevo (no hace falta `--build` otra vez).
- Algo sobre `JWT_SECRET` o variables vacías → revisa que el `.env` del paso 10 esté completo y guardado.

**Un puerto ya está en uso** (`bind: address already in use`)
```bash
sudo ss -tlnp | grep ':80 '
```
Eso te dice qué programa ya está usando ese puerto. En un Ubuntu Server recién instalado esto casi nunca pasa (no debería haber nada más corriendo), pero si pasa, dime qué te muestra ese comando y lo resolvemos.

**No puedes entrar desde otro dispositivo a `http://<IP>/`**
1. Confirma que el otro dispositivo esté en la **misma red** (mismo wifi/router) que el servidor.
2. Desde el otro dispositivo, prueba hacer ping: `ping <IP_DEL_SERVIDOR>` — si no responde, es un tema de red, no de la aplicación.
3. Confirma que el firewall del servidor permite el puerto 80 (paso 16: `sudo ufw status` debería listarlo).

**Inicias sesión pero algo no carga bien (fotos, mapas, etc.)**
```bash
docker logs simtrg_backend --tail 100
```
Casi siempre es una variable del `.env` mal copiada (revisa que no haya espacios de más ni comillas donde no van).

**Se llenó el disco**
```bash
df -h
```
Busca la línea de `/` — si está por encima de 90%, es momento de revisar cuántas fotos hay acumuladas o ampliar el disco. Con 1 TB esto debería tardar años en pasar (ver sección 3).

**Si te trabas en algo que no está aquí**: copia el mensaje de error completo (con `docker logs`) y tráemelo en la próxima sesión — con eso puedo diagnosticar exactamente qué pasó.

---

## 18. Checklist final

- [ ] Computadora con Ubuntu Server instalado, conectada por cable de red.
- [ ] IP fija reservada (paso 7).
- [ ] Docker instalado y funcionando (`docker --version`).
- [ ] Proyecto copiado al servidor.
- [ ] `.env` de producción creado con secretos nuevos (paso 10).
- [ ] `docker compose up -d --build` corrido sin errores.
- [ ] Los 3 contenedores en estado "healthy" (`docker ps`).
- [ ] Puedes entrar a `http://<IP>/` desde otro dispositivo en la red e iniciar sesión.
- [ ] Le avisaste a tu compañero la IP fija y la clave del ESP32 (paso 13).
- [ ] Backup automático configurado (paso 14).
- [ ] Firewall activado (paso 16).

Con eso, el sistema queda funcionando de forma permanente, recogiendo información sin depender de que tu laptop esté prendida.
