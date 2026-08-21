# Guía para ti — cómo probar el Gestor de Drones con Postman (y entender las IPs)

Esta guía es para ti, no para tu compañero. Te explica en palabras simples cómo se van a comunicar las piezas y cómo probar todo con Postman antes de que el ESP32 esté conectado.

---

## 1. Quién habla con quién (sin tecnicismos)

Pensalo como una oficina con teléfonos internos:

```
┌─────────────────────────────┐
│  Tu computadora              │   ← Aquí vive la aplicación (Docker).
│  IP: 10.101.27.238           │   Esta es "la central telefónica".
│  (el "servidor")             │   Todos le llaman a ESTE número.
└──────────────┬────────────────┘
               │
               │  (misma red wifi/router)
               │
   ┌───────────┼───────────────┐
   │           │               │
┌──▼───┐   ┌───▼────┐    ┌─────▼──────┐
│ ESP32 │   │ Postman │    │ Laptop de  │
│(cuando│   │ (tú, para│   │ tu compañero│
│esté   │   │ probar)  │   │ 10.101.27.185│
│listo) │   │          │   │ (irrelevante │
│       │   │          │   │ para esto)  │
└───────┘   └──────────┘    └────────────┘
```

**La única IP que le tenés que dar a alguien es la de tu computadora: `10.101.27.238`.**

- El ESP32, cuando esté programado, le va a mandar peticiones a `http://10.101.27.238:3000/...` — como si "llamara a ese número de teléfono".
- Vos, para probar con Postman, también le apuntás a esa misma dirección, desde cualquier computadora que esté en la misma red wifi.
- La IP de la laptop de tu compañero (`10.101.27.185`) no la necesita nadie para esto — es solo la máquina donde él escribe el código, no participa en la comunicación real.

### ⚠️ Importante: esta IP puede cambiar
`10.101.27.238` es la IP que el router le asignó a tu computadora **ahora mismo**. Si apagás la compu y la volvés a prender, o pasa mucho tiempo, el router *podría* darle una IP distinta. Dos soluciones:
- **Simple**: cada vez que vayan a probar, confirmá tu IP actual (ver sección 4) y avisale a tu compañero si cambió.
- **Mejor a largo plazo**: pedirle a quien administre el router que reserve siempre esa misma IP para tu computadora ("IP fija" o "reserva DHCP" — quien instale el servidor definitivo lo puede configurar una sola vez y listo).

---

## 2. Instalar y configurar Postman (una sola vez)

1. Descargá Postman gratis: [postman.com/downloads](https://www.postman.com/downloads/) (Windows/Mac/Linux).
2. Instalalo y abrilo. Podés crear una cuenta gratuita o usarlo sin cuenta ("skip" / saltar).
3. Click en **"New" → "HTTP Request"** (o el botón `+` para una pestaña nueva).

---

## 3. Probar el endpoint del ESP32 desde Postman

Esto simula EXACTAMENTE lo que va a hacer el módulo cuando esté listo.

1. En el menú desplegable de método (dice "GET" por defecto), cambialo a **POST**.
2. En la barra de URL, pegá:
   ```
   http://10.101.27.238:3000/api/v1/drones-fisicos/movimiento-dispositivo
   ```
3. Andá a la pestaña **"Headers"** (debajo de la URL) y agregá dos filas:

   | Key | Value |
   |---|---|
   | `Content-Type` | `application/json` |
   | `X-Device-Key` | `a65586739ac48ca910f75c425b3479b9b580afaa68ec4178` |

4. Andá a la pestaña **"Body"**, seleccioná la opción **"raw"**, y en el desplegable de la derecha elegí **"JSON"** (en vez de "Text").
5. Pegá esto en el cuadro grande de texto:
   ```json
   {
     "tagUsuario": "TESTUSER01",
     "tagDron": "TESTDRON01"
   }
   ```
6. Click en el botón azul **"Send"**.
7. Abajo vas a ver la respuesta. Si pusiste un tag que no existe todavía en el sistema, es normal y correcto que responda:
   ```json
   { "ok": false, "mensaje": "Tarjeta o usuario no reconocido." }
   ```
   Eso significa que **la comunicación funciona perfecto** — el servidor te contestó, solo que esos tags de prueba no están registrados.

### Para probar con tags que sí existen
Repetí los pasos con un dron y un usuario que ya tengan Tag RFID asignado en la app (Gestor de Drones / Gestionar Usuarios). Al mandar la petición dos veces seguidas con los mismos dos tags, la primera vez debería decir `"accion": "SALIDA"` y la segunda `"accion": "ENTRADA"`.

---

## 4. Cómo confirmar tu propia IP (por si cambia)

**En tu computadora (Linux, como esta que usaste hoy):**
```bash
hostname -I
```
Te va a mostrar algo como `10.101.27.238`. Esa es la IP que hay que usar.

**Si en algún momento se prueba desde Windows:**
Abrir "Símbolo del sistema" (cmd) y escribir `ipconfig` — buscar "Dirección IPv4".

---

## 5. Si tu compañero no logra conectarse (checklist de problemas comunes)

1. **¿Están en la misma red wifi/router?** Si uno está conectado por cable y otro por wifi pero al mismo router, normalmente igual funciona — pero si están en redes wifi *distintas* (por ejemplo, uno usando datos móviles), no se van a poder ver. Confirmen que ambos dispositivos estén conectados al mismo router.
2. **Probar si se "ven" entre sí**: desde la terminal de la otra computadora, correr:
   ```
   ping 10.101.27.238
   ```
   Si responde con tiempos (ej. `time=2ms`), están en la misma red y sí se pueden comunicar. Si dice "tiempo de espera agotado" / "timeout", el problema es de red, no de la aplicación.
3. **Firewall**: es posible que tu computadora tenga un firewall que bloquee conexiones entrantes al puerto 3000 desde OTRAS máquinas (mientras que desde la misma compu, como hicimos toda esta sesión, sí funciona porque es "tráfico local"). Si el `ping` funciona pero Postman desde la otra máquina da error de conexión, ese es probablemente el motivo — hay que permitir el puerto 3000 en el firewall de tu computadora (te puedo ayudar con eso si pasa).
4. **¿Está corriendo el backend?** Confirmá que el contenedor Docker esté levantado (`docker ps` debería mostrar `simtrg_backend` como "Up").

---

## 6. Resumen para pasarle a tu compañero cuando estén por probar juntos

Cuando llegue el momento de la prueba conjunta con el ESP32 real, solo necesitás decirle:
> "La IP del servidor es `10.101.27.238` (o la que confirmes con `hostname -I` ese día), puerto `3000`. La clave y el formato ya los tenés en la otra guía."

Eso es todo lo que él necesita de tu lado — el resto ya está en `GUIA_INTEGRACION_ESP32_DRONES.md`.
