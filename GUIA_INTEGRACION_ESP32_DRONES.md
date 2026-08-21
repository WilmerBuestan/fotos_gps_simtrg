# Guía de integración ESP32/RFID — Gestor de Drones (SIMTRG)

**Para**: desarrollador del módulo ESP32 + lector RFID
**Objetivo**: que el equipo, en vez de (o además de) escribir en Google Sheets, le avise directamente al backend de SIMTRG cada vez que alguien saca o entrega un dron.

El backend ya está listo, probado y funcionando. Esta guía es exclusivamente la parte que falta del lado del ESP32.

---

## 1. Cómo funciona hoy el sistema (para entender qué vas a conectar)

- Cada **dron físico** tiene una tarjeta/etiqueta RFID propia.
- Cada **usuario** (operador, supervisor, etc.) tiene su propia tarjeta RFID.
- El backend **no necesita que le digas** si es una salida o una entrada — él solo lo decide, según si el dron ya estaba prestado o no. Vos solo le mandás "esta persona escaneó esta tarjeta de dron", y listo.
- Ya probamos manualmente todo el flujo (crear drones, asignar tags, registrar movimientos) y funciona sin problemas. Lo único que falta es que el ESP32 le hable a esta API en vez de a Google Sheets.

---

## 2. Paso a paso — qué tenés que hacer

### Paso 1 — No toques la parte de lectura RFID
Tu código que lee las tarjetas y obtiene el UID **se queda igual**. No hay que cambiar el lector ni la lógica de lectura.

### Paso 2 — Confirmá el formato del UID que ya estás leyendo
Antes de programar nada nuevo, fijate cómo estás mandando el UID a Google Sheets hoy (¿mayúsculas o minúsculas? ¿con espacios o dos puntos entre bytes, tipo `04:A3:B2:C1`, o todo junto `04A3B2C1`?).

**El backend espera**: texto en **mayúsculas**, **sin separadores** (sin espacios, sin `:`, sin `-`). Ejemplo válido: `04A3B2C1`.

Si tu código ya arma el UID con separadores, es un cambio chico (sacar los `:` y aplicar `.toUpperCase()` o el equivalente en tu librería).

### Paso 3 — Mantené la secuencia: primero persona, después dron
1. Se escanea la tarjeta de la **persona** → guardás ese UID en una variable.
2. Se escanea la tarjeta del **dron** → ahí armás y mandás la petición con los dos UID juntos.
3. Si pasan varios segundos (sugerencia: 10 segundos) entre el primer escaneo y el segundo sin que llegue la segunda tarjeta, descartá el primero y volvé a esperar desde cero (para que no quede "pegado" un escaneo viejo).

### Paso 4 — Armá y mandá la petición HTTP
Ver la sección 3 (especificación técnica exacta) para la URL, el header y el formato del body.

### Paso 5 — Mostrá el resultado
La respuesta siempre trae un campo `ok` (`true`/`false`).
- `ok: true` → salida o entrada registrada correctamente. Mostrá LED verde / mensaje de éxito.
- `ok: false` → algo falló (tarjeta no reconocida, dron en mantenimiento, etc.). El campo `mensaje` trae el motivo en español, para mostrarlo en pantalla si el equipo tiene una, o al menos loguearlo. Mostrá LED rojo / mensaje de error.

### Paso 6 — Probá primero contra la red local, no en producción
El servidor va a estar en la misma red local que el ESP32 (no necesita salir a internet). Te vamos a pasar la IP real del servidor cuando estén listos para probar juntos — mientras tanto podés usar la IP de prueba de la sección 3.

### Paso 7 — Qué pasa si no hay red
Si el POST falla (WiFi caído, servidor no responde), **por ahora alcanza con mostrar un error** (LED rojo, mensaje "sin conexión"). No hace falta guardar el intento para reintentarlo después — eso lo agregamos más adelante si hace falta.

---

## 3. Especificación técnica exacta

### Endpoint
```
POST http://<IP_DEL_SERVIDOR>:3000/api/v1/drones-fisicos/movimiento-dispositivo
```
IP de referencia usada en las pruebas de esta sesión: `10.101.27.238` (**esto es solo un ejemplo** — vamos a confirmar la IP real del servidor donde va a quedar corriendo antes de la prueba conjunta).

### Headers
```
Content-Type: application/json
X-Device-Key: a65586739ac48ca910f75c425b3479b9b580afaa68ec4178
```
Esa clave es fija y secreta — es lo que le prueba al servidor que la petición viene del equipo autorizado y no de cualquiera en la red. No la publiques en un repositorio público ni la compartas fuera de este equipo de trabajo.

### Body (JSON)
```json
{
  "tagUsuario": "04A3B2C1",
  "tagDron": "0B7F1A22"
}
```
| Campo | Tipo | Descripción |
|---|---|---|
| `tagUsuario` | string | UID de la tarjeta de la persona, mayúsculas, sin separadores |
| `tagDron` | string | UID de la tarjeta del dron, mismo formato |

### Respuesta — siempre HTTP 200

**Éxito (salida):**
```json
{
  "ok": true,
  "accion": "SALIDA",
  "mensaje": "Salida registrada: DRN-001 → Juan Pérez",
  "dron": { "id": "...", "codigoInterno": "DRN-001", "estado": "PRESTADO" },
  "usuario": { "id": "...", "nombreCompleto": "Juan Pérez" }
}
```

**Éxito (entrada — mismo dron, segundo escaneo):**
```json
{
  "ok": true,
  "accion": "ENTRADA",
  "mensaje": "Entrada registrada: DRN-001 ← Juan Pérez",
  "dron": { "id": "...", "codigoInterno": "DRN-001", "estado": "DISPONIBLE" },
  "usuario": { "id": "...", "nombreCompleto": "Juan Pérez" }
}
```

**Error — tarjeta no reconocida:**
```json
{ "ok": false, "mensaje": "Tarjeta o usuario no reconocido." }
```

**Error — dron no disponible:**
```json
{ "ok": false, "mensaje": "El dron DRN-001 está en mantenimiento." }
```

En el ESP32, con leer el campo `ok` como booleano alcanza para decidir el LED/mensaje — no hace falta interpretar código de estado HTTP, siempre va a ser 200.

### Ejemplo para probar desde una computadora (sin el ESP32)
Así podés confirmar que tu request está bien armado, aunque sea todavía desde una PC y no desde el equipo:
```bash
curl -X POST http://10.101.27.238:3000/api/v1/drones-fisicos/movimiento-dispositivo \
  -H "X-Device-Key: a65586739ac48ca910f75c425b3479b9b580afaa68ec4178" \
  -H "Content-Type: application/json" \
  -d '{"tagUsuario":"04A3B2C1","tagDron":"0B7F1A22"}'
```
(Con tags que todavía no existen en el sistema, la respuesta correcta esperada es `{"ok":false,"mensaje":"Tarjeta o usuario no reconocido."}` — eso confirma que el servidor te está respondiendo bien, solo que esos tags de prueba no están registrados.)

---

## 4. Qué nos tenés que entregar al terminar

- [ ] **Código fuente actualizado** del ESP32 (o el diff/parche de qué cambiaste respecto a la versión que ya funciona con Google Sheets).
- [ ] **Confirmación del UID exacto** que lee tu código para 2-3 tarjetas reales de prueba (una de dron, una de persona) — con eso las damos de alta en el sistema para la prueba conjunta.
- [ ] **Descripción o video corto de la secuencia física**: cuánto tarda entre escanear la tarjeta de persona y la del dron, qué pasa si solo se escanea una y no la otra, qué pasa si se escanea la misma tarjeta dos veces seguidas.
- [ ] **Confirmación de qué feedback da el equipo** en caso de éxito y de error (color de LED, sonido, mensaje en pantalla si tiene una) — para saber qué mostrar en cada caso.
- [ ] Avisar cuando esté listo para la **prueba conjunta en la red local real** (ahí te pasamos la IP definitiva del servidor).

---

## 5. Botón de "tarjeta única" (operador sin su tarjeta física)

Ya está soportado del lado del servidor el caso donde el operador perdió/olvidó su tarjeta y ustedes solo pueden escanear la del dron (o viceversa). Cuando se presione ese botón nuevo y solo se logre leer una tarjeta, el JSON que mandan debe traer **solo el campo correspondiente**, omitiendo el otro por completo (no mandar `""` ni `null`, simplemente no incluir la clave):

```json
{ "tagDron": "0B7F1A22" }
```
o, si en cambio se leyó la del operador y no la del dron:
```json
{ "tagUsuario": "04A3B2C1" }
```

Va al mismo endpoint, misma URL, misma clave — nada nuevo que configurar de ese lado. La respuesta en este caso trae `pendiente: true` en vez de `accion`:

```json
{
  "ok": true,
  "pendiente": true,
  "mensaje": "Dron DRN-001 identificado, falta la tarjeta del operador. Complete el registro desde el sistema."
}
```

Con `ok: true` alcanza para el LED/mensaje de éxito igual que siempre — el resto (elegir manualmente desde la web quién faltaba) lo completamos nosotros, no requiere nada más del ESP32. Si se manda un tag que no existe en el sistema, la respuesta es la misma de siempre (`ok:false, mensaje:"Tarjeta o dron no reconocido."` o el equivalente de usuario).

## 6. Cómo verificar el UID de una tarjeta sin escribir código

Por si necesitás confirmar UID de tarjetas específicas rápido:
1. **Monitor Serie del Arduino IDE / PlatformIO**: la mayoría de librerías RFID imprimen el UID leído ahí apenas se acerca la tarjeta.
2. **Celular con NFC** (si las tarjetas son RFID/NFC estándar tipo Mifare, lo más común): instalar la app gratuita **"NFC Tools"** (Android/iOS), activar el NFC del teléfono, y acercar la tarjeta a la parte de atrás — la app muestra el UID al instante, sin necesitar el ESP32 para nada.
