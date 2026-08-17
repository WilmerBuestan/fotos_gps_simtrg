# SIMTRG — Documentación Técnica y Hoja de Ruta

**29 BIM · GMREC** · Última actualización: 2026-08-17

Este documento explica, en lenguaje lo más claro posible, **qué tecnologías usa SIMTRG y por qué**, **qué opciones existen para alojarlo de forma permanente** (con precios de referencia), y **cómo se vería un futuro sistema de inteligencia artificial** que identifique novedades automáticamente en las fotos, dividido en etapas realistas.

---

## Índice

1. [Tecnologías usadas y por qué](#1-tecnologías-usadas-y-por-qué)
2. [Cómo está organizado el sistema](#2-cómo-está-organizado-el-sistema)
3. [Opciones de alojamiento (hosting)](#3-opciones-de-alojamiento-hosting)
4. [Hoja de ruta hacia Machine Learning](#4-hoja-de-ruta-hacia-machine-learning)
5. [Resumen y recomendación](#5-resumen-y-recomendación)

---

## 1. Tecnologías usadas y por qué

SIMTRG se divide en tres capas: una base de datos, un backend (servidor que procesa la información) y un frontend (la página web que se usa). Se eligieron herramientas **maduras, gratuitas (código abierto) y ampliamente documentadas**, para no depender de licencias pagas ni de un solo proveedor.

### Base de datos

| Tecnología | Rol | Por qué se eligió |
|---|---|---|
| **PostgreSQL 15** | Guarda todos los datos: usuarios, fotos, eventos, coordenadas | Es la base de datos de código abierto más robusta del mercado; gratuita y sin límite de uso |
| **PostGIS** (extensión de PostgreSQL) | Permite hacer cálculos geográficos reales (ej. "¿este punto GPS cae dentro de qué provincia/cantón?", distancias, mapas de calor) | Es el estándar de la industria para datos geoespaciales; evitó depender de un servicio externo de geolocalización (relevante por seguridad operacional — ver sección 3) |

### Backend (servidor)

| Tecnología | Rol | Por qué se eligió |
|---|---|---|
| **Node.js** | Motor que ejecuta el servidor | Permite usar el mismo lenguaje (JavaScript/TypeScript) en backend y frontend, lo que reduce la curva de aprendizaje para dar mantenimiento a futuro |
| **NestJS** | Framework que organiza el código del backend | Impone una arquitectura ordenada (separando reglas de negocio, base de datos y seguridad), lo cual facilita que otra persona pueda entender y modificar el sistema en el futuro sin romper lo existente |
| **TypeORM** | Traduce entre el código y la base de datos (y controla las migraciones, es decir, los cambios de estructura de la BD con historial) | Evita escribir SQL manual propenso a errores y deja un registro versionado de cada cambio a la base de datos |
| **JWT (JSON Web Token) + bcrypt/bcryptjs** | Maneja el inicio de sesión y la seguridad de contraseñas | Estándar de la industria: la contraseña nunca se guarda en texto plano (se guarda "hasheada", es decir, cifrada en un solo sentido), y cada sesión expira automáticamente (8 horas) |
| **Passport.js** | Motor de autenticación que se conecta con JWT | Librería estándar de Node.js para manejar login de forma segura |
| **Helmet** | Agrega cabeceras de seguridad HTTP | Protege contra ataques web comunes (XSS, clickjacking, etc.) con una sola línea de configuración |
| **@nestjs/throttler** | Limita cuántas peticiones puede hacer una misma IP por minuto | Evita ataques de fuerza bruta o de saturación (DoS) al servidor |
| **exifr** | Lee los metadatos EXIF de las fotos (incluyendo GPS si el dron lo grabó) | Es la librería más completa y mantenida para leer metadatos de imagen en JavaScript |
| **sharp** | Procesa y optimiza las imágenes subidas (miniaturas, compresión) | La librería de procesamiento de imágenes más rápida disponible para Node.js |
| **multer** | Recibe los archivos subidos (fotos) desde el navegador | Estándar de facto para manejo de subida de archivos en NestJS/Express |
| **class-validator** | Valida que los datos que llegan al servidor tengan el formato correcto | Evita que datos corruptos o maliciosos lleguen a la base de datos |
| **Swagger** (`@nestjs/swagger`) | Genera documentación interactiva de la API automáticamente | Permite probar y entender todos los endpoints sin necesidad de leer el código fuente |

### Frontend (interfaz web)

| Tecnología | Rol | Por qué se eligió |
|---|---|---|
| **React 19** | Construye la interfaz visual (páginas, botones, formularios) | Es la librería de interfaces más usada del mundo; facilita encontrar ayuda/documentación y personal capacitado a futuro |
| **Vite** | Compila y sirve el proyecto en desarrollo y producción | Mucho más rápido que herramientas anteriores (Webpack), reduce tiempos de espera al programar |
| **TypeScript** | Es JavaScript con tipos de datos definidos | Detecta errores antes de ejecutar el código (ej. enviar texto donde se espera un número), reduciendo bugs |
| **react-leaflet + Leaflet** | Motor de mapas interactivos (mapa de calor, mapa geoespacial, línea de tiempo) | Alternativa gratuita y de código abierto a Google Maps; no requiere clave de API ni pagos por uso |
| **leaflet.heat** | Genera el mapa de calor sobre Leaflet | Complemento estándar para mapas de densidad/calor sobre Leaflet |
| **recharts** | Genera los gráficos del dashboard (barras, áreas) | Librería de gráficos hecha específicamente para React, con buena documentación |
| **axios** | Hace las llamadas del frontend hacia el backend (API) | Maneja errores y configuración de forma más simple que las herramientas nativas del navegador |
| **@tanstack/react-query** | Administra la sincronización de datos entre el frontend y el backend (caché, recarga automática) | Evita tener que programar manualmente la lógica de "cuándo volver a pedir datos al servidor" |

### Infraestructura y despliegue

| Tecnología | Rol | Por qué se eligió |
|---|---|---|
| **Docker + Docker Compose** | Empaqueta el backend y la base de datos en "contenedores" que corren igual en cualquier computadora | Evita el problema de "en mi máquina sí funciona": cualquier PC con Docker instalado puede levantar el sistema exactamente igual, sin instalar Node, PostgreSQL, etc. por separado |
| **Git / GitHub** | Guarda el historial de cambios del código y sirve de respaldo | Permite recuperar versiones anteriores del código y trabajar de forma ordenada |

---

## 2. Cómo está organizado el sistema

```
┌─────────────────────┐         ┌──────────────────────┐         ┌────────────────────┐
│   Frontend (React)  │  HTTP   │   Backend (NestJS)    │  SQL    │  PostgreSQL+PostGIS │
│   localhost:5173    │ ──────► │   localhost:3000      │ ──────► │   (en Docker)       │
│   (navegador)        │ ◄────── │   (en Docker)          │ ◄────── │                     │
└─────────────────────┘  JSON   └──────────────────────┘         └────────────────────┘
```

El backend sigue **arquitectura hexagonal** (también llamada "arquitectura limpia"): separa las reglas del negocio (ej. "un operador solo puede ver sus propias fotos") de los detalles técnicos (ej. cómo se guarda en PostgreSQL). Esto significa que, si en el futuro se quisiera cambiar de base de datos o agregar otra forma de guardar archivos, **no habría que reescribir la lógica de negocio**, solo la parte que conecta con eso. Es una inversión en mantenibilidad a largo plazo, no solo una preferencia estética.

---

## 3. Opciones de alojamiento (hosting)

Ahora mismo, SIMTRG corre de forma **local**, es decir, en la misma computadora desde la que se usa. Para que varias personas de la unidad puedan acceder desde sus propios equipos (o desde el campo), el sistema necesita quedar corriendo en un **servidor** disponible todo el tiempo. Hay dos caminos.

### Consideración previa: dónde viven los datos

SIMTRG maneja información táctica (fotos de dron georreferenciadas, eventos, ubicaciones). Por esa razón, en una decisión anterior del proyecto se optó deliberadamente por **no depender de servicios externos de geolocalización** (se usan datos geográficos embebidos en el propio sistema, calculados sin salir a internet). El mismo criterio de seguridad operacional (OPSEC) aplica a la decisión de dónde alojar el sistema: un servidor en la nube implica que los datos se guardan en la infraestructura de una empresa externa (aunque cifrados), mientras que un servidor físico en la unidad mantiene los datos completamente dentro de la instalación. Esta es la variable más importante a decidir, más allá del costo.

---

### Opción A — Servidor en la nube (contratado)

Se contrata una máquina virtual en un proveedor de hosting y el sistema corre ahí, accesible por internet (o solo por VPN si se restringe el acceso).

**Cómo funciona:** es prácticamente el mismo `docker compose up -d` que ya se usa localmente, pero ejecutado dentro de una máquina alquilada en vez de la propia PC. La complejidad adicional está en configurar el dominio, HTTPS (certificado de seguridad) y, si se quiere máxima seguridad, una VPN para que el sistema no sea accesible desde cualquier punto de internet.

**Proveedores de referencia y precios (agosto 2026):**

| Proveedor | Plan de referencia | Especificaciones | Costo mensual aprox. |
|---|---|---|---|
| **Hetzner Cloud** | CX23 | 2 vCPU, 4 GB RAM, 40 GB SSD, 20 TB de tráfico | **~$5 USD/mes** |
| **DigitalOcean** | Basic Droplet | 2 vCPU, 4 GB RAM, 4 TB de tráfico | **~$24 USD/mes** |
| **DigitalOcean** | Básico económico | 1 vCPU, 1 GB RAM | **~$6 USD/mes** (suficiente solo para pruebas, no para uso real) |

*(Precios de referencia pública de los proveedores; pueden variar. Fuentes consultadas en la elaboración de este documento: [Hetzner Cloud pricing](https://www.hetzner.com/cloud/), [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets).)*

Para uso real de la unidad (varios operadores subiendo fotos, mapas y dashboard funcionando simultáneamente), un plan de **2 vCPU / 4 GB RAM (~$5–24/mes según proveedor)** es un punto de partida razonable. A eso hay que sumar, si se desea un nombre de dominio propio (ej. `simtrg.ejercito.gob.ec` en vez de una IP numérica), un costo adicional de dominio (~$10–15 USD/año) y, opcionalmente, un certificado HTTPS (gratuito con herramientas como Let's Encrypt).

**Ventajas:**
- Disponible 24/7 sin depender de que una PC física de la unidad quede encendida.
- El proveedor se encarga del hardware (si falla un disco, lo reemplazan ellos).
- Fácil de escalar (subir de plan) si el uso crece.
- Se puede acceder desde cualquier lugar con internet (o restringir con VPN).

**Desventajas:**
- Costo recurrente mensual indefinido.
- Los datos quedan alojados fuera de la infraestructura física de la unidad (ver consideración de OPSEC arriba).
- Requiere conocimientos de administración de servidores Linux (o contratar/capacitar a alguien que los tenga) para mantenerlo seguro y actualizado.
- Depende de que el proveedor de hosting siga operando y de la conexión a internet de la unidad.

**Complejidad estimada:** Media. Levantar el sistema es casi idéntico a hacerlo local; lo que agrega dificultad es configurar el acceso seguro (firewall, VPN, HTTPS) y mantener el servidor actualizado con el tiempo.

---

### Opción B — Servidor físico en la unidad

Se destina una computadora (nueva o una máquina existente reutilizada) que queda físicamente en la unidad, corriendo el sistema de forma permanente dentro de la red interna.

**Sub-opción B.1 — Linux Server (recomendado)**

Se instala una distribución Linux orientada a servidores (ej. Ubuntu Server, que es gratuita) y se corre exactamente el mismo `docker compose` que ya se usa hoy.

- **Costo de software:** $0 (Ubuntu Server y Docker son gratuitos).
- **Costo de hardware:** si se reutiliza una PC vieja que cumpla con al menos 4 GB de RAM y 20 GB de disco libre, el costo es $0. Si se compra un equipo nuevo dedicado, un mini-PC o servidor de entrada (ej. Intel NUC o similar con 8–16 GB RAM) puede costar aproximadamente **$300–600 USD** (compra única, no recurrente).
- **Complejidad:** Media-alta la primera vez (instalar Linux, configurar Docker, abrir el puerto correcto en la red interna), pero una vez configurado el mantenimiento es similar al que ya se hace hoy en desarrollo.

**Sub-opción B.2 — Windows Server**

Misma idea, pero usando Windows Server en vez de Linux.

- **Costo de software:** Windows Server **no es gratuito** — requiere licencia (las licencias de Windows Server Standard rondan los **$500–1,100 USD**, dependiendo de la edición y el número de núcleos/usuarios), a menos que la unidad ya cuente con una licencia por convenio institucional.
- **Ventaja sobre Linux:** si el personal de sistemas de la unidad ya está familiarizado con administrar Windows (más común en entornos administrativos que Linux), la curva de aprendizaje para el equipo de soporte es menor.
- **Desventaja:** Docker en Windows Server es más pesado en recursos que en Linux, y la mayoría de herramientas de este tipo de sistemas (incluyendo todo el stack de SIMTRG) fueron diseñadas pensando en Linux, por lo que Linux es la opción técnicamente más eficiente y con menos fricción a largo plazo.

**Ventajas generales de un servidor físico en la unidad (ambas sub-opciones):**
- Control total: los datos nunca salen de la infraestructura de la unidad.
- Sin costo mensual recurrente de hosting (solo electricidad y, eventualmente, mantenimiento de hardware).
- No depende de la conexión a internet para el uso interno (solo se necesitaría internet si se quiere acceso remoto desde fuera de la unidad).

**Desventajas generales:**
- Si el equipo se daña (disco duro, fuente de poder, etc.), el sistema deja de funcionar hasta repararlo — no hay "reemplazo automático" como en la nube.
- Requiere que alguien de la unidad (o un técnico externo) le dé mantenimiento físico y lógico (actualizaciones, respaldos/backups periódicos).
- Si se necesita acceso desde fuera de la red interna (ej. un operador en el campo), hay que configurar una VPN o exponer el puerto a internet — esto último no se recomienda sin asesoría de seguridad.
- Nadie hace respaldos automáticos por defecto: hay que definir e implementar una rutina de backup (ej. copiar la base de datos a un disco externo semanalmente).

**Complejidad estimada:** Media-alta para el montaje inicial, baja para el uso diario posterior.

---

### Comparación rápida

| Criterio | Nube (contratada) | Físico en la unidad (Linux) | Físico en la unidad (Windows) |
|---|---|---|---|
| Costo inicial | $0 | $0 (PC reutilizada) – $600 (equipo nuevo) | $0–600 + licencia (~$500–1,100) |
| Costo recurrente | ~$5–24 USD/mes | Solo electricidad | Solo electricidad |
| Control de los datos | Fuera de la unidad | Total, dentro de la unidad | Total, dentro de la unidad |
| Disponibilidad 24/7 | Alta (responsabilidad del proveedor) | Depende del hardware propio | Depende del hardware propio |
| Curva de aprendizaje | Media (admin. Linux remoto) | Media-alta (montaje inicial) | Media (si ya conocen Windows) |
| Acceso remoto (fuera de la unidad) | Nativo | Requiere VPN | Requiere VPN |
| Respaldos (backups) | Algunos proveedores lo ofrecen pagado | Manual, a definir | Manual, a definir |

**Sugerencia:** dado que el sistema maneja información táctica y ya hubo una decisión previa de evitar dependencias externas por seguridad operacional, **la opción de servidor físico en la unidad con Linux Server** es la más alineada con esa misma lógica, y además es la de menor costo recurrente. La opción en la nube es razonable si se prioriza no tener que dar mantenimiento de hardware propio y se acepta que los datos vivan fuera de la unidad (mitigable parcialmente con cifrado y buenas prácticas, pero no elimina la dependencia de un tercero).

---

## 4. Hoja de ruta hacia Machine Learning

El objetivo a futuro es que el sistema **identifique novedades automáticamente en las fotos** (por ejemplo, detectar vehículos, personas, estructuras o anomalías sin que un operador tenga que revisarlas manualmente una por una) y, eventualmente, **hacer predicciones** (por ejemplo, estimar zonas con mayor probabilidad de actividad según el histórico).

Esto **no es un solo paso**, es un camino de varias etapas, y cada una depende de que la anterior esté madura. Intentar saltar etapas es la causa más común de que este tipo de proyectos fracase.

### Etapa 0 — Recolección de datos (en curso actualmente)

Lo que se está construyendo *ahora mismo* con SIMTRG. Sin datos suficientes, ordenados y etiquetados correctamente, ningún modelo de Machine Learning puede funcionar — esta etapa **es la base de todo lo demás**, no un paso previo desechable.

- **Qué se necesita:** seguir usando el sistema de forma consistente, con buenas prácticas (siempre clasificar el tipo de evento, no dejar campos vacíos si se puede evitar, corregir el GPS manualmente cuando falte en vez de omitirlo).
- **Complejidad técnica:** Baja — ya está resuelta con lo que existe hoy.
- **Conocimiento de dominio necesario:** Alto — esta es la etapa donde más importa el criterio militar/táctico del equipo, no el técnico. Las decisiones de "qué se considera una novedad" y "cómo se clasifica" las debe definir la unidad, no un desarrollador.
- **Tiempo estimado:** Continuo; en general se necesitan **cientos a pocos miles** de fotos ya etiquetadas por categoría antes de que un modelo de clasificación tenga sentido (ver Etapa 2).

### Etapa 1 — Reglas automáticas simples (no es todavía "IA")

Antes de entrenar un modelo, se puede automatizar mucho con lógica simple basada en lo que el sistema ya sabe: por ejemplo, alertas automáticas si se suben muchas fotos de un mismo tipo de evento en una zona en poco tiempo, o resúmenes automáticos por patrón de fechas/ubicación.

- **Complejidad técnica:** Baja-media. Es programación tradicional (si-entonces), no Machine Learning real.
- **Conocimiento de dominio necesario:** Alto (definir qué patrones importan).
- **Curva de aprendizaje:** Baja para el equipo de desarrollo actual — se puede construir con las mismas tecnologías que ya tiene el backend.
- **Valor:** Genera beneficio inmediato y sirve como "puente" antes de invertir en modelos de IA reales.

### Etapa 2 — Clasificación de imágenes (identificación de novedades)

Aquí empieza el Machine Learning propiamente dicho. El objetivo es que el sistema, al recibir una foto, diga automáticamente algo como "esto probablemente es una novedad de tipo X" o "no se detecta nada relevante".

- **Cómo se hace en la práctica:** no se entrena un modelo desde cero (eso requeriría millones de imágenes). Se usa una técnica llamada **transferencia de aprendizaje (transfer learning)**: se parte de un modelo ya entrenado por terceros con millones de imágenes genéricas (ej. YOLOv8, ResNet, MobileNet) y se le enseña a reconocer las categorías específicas de SIMTRG usando las fotos ya etiquetadas de la Etapa 0.
- **Complejidad técnica:** Media-alta. Requiere Python (no JavaScript), librerías especializadas (PyTorch o TensorFlow), y entender conceptos de visión por computadora.
- **Conocimiento de dominio necesario:** Alto — alguien debe definir con precisión las categorías a detectar y validar que el modelo esté aprendiendo lo correcto y no "atajos" incorrectos (ej. que aprenda a reconocer el fondo del paisaje en vez del objeto real).
- **Curva de aprendizaje:** Alta si nadie del equipo tiene experiencia previa en Machine Learning — es razonable estimar **varios meses** de aprendizaje y experimentación para alguien nuevo en el tema, o la incorporación de una persona/consultor con experiencia previa en visión por computadora.
- **Requisito de hardware:** entrenar el modelo se beneficia mucho de una GPU (tarjeta gráfica), aunque se puede hacer sin ella usando servicios en la nube por horas (ej. Google Colab, que tiene un nivel gratuito limitado, o instancias con GPU alquiladas por uso).
- **Requisito de datos:** esta etapa es la razón principal por la que la Etapa 0 debe mantenerse activa el mayor tiempo posible antes de empezar — la calidad del modelo depende directamente de la cantidad y calidad de fotos ya etiquetadas.

### Etapa 3 — Detección y localización de objetos dentro de la foto

Un paso más avanzado que la Etapa 2: en vez de solo decir "esta foto tiene una novedad", el sistema marca **exactamente dónde** en la imagen está (con un recuadro), y puede detectar **varios objetos distintos en la misma foto** (ej. "2 vehículos y 1 persona").

- **Complejidad técnica:** Alta. Es una extensión natural de la Etapa 2 (de hecho, herramientas como YOLO ya hacen esto), pero requiere etiquetar los datos de forma más detallada (no solo "esta foto es tipo X", sino "el objeto está en esta posición exacta de la foto").
- **Conocimiento de dominio necesario:** Alto, igual que la Etapa 2, pero con más carga de trabajo de etiquetado.
- **Curva de aprendizaje:** Alta, pero incremental respecto a la Etapa 2 — no es empezar de cero si la Etapa 2 ya se dominó.

### Etapa 4 — Predicciones y análisis de patrones

La etapa más avanzada: usar el historial acumulado (ubicación, fecha, tipo de evento) para **predecir** dónde o cuándo es más probable que ocurra cierto tipo de actividad, usando análisis geoespacial-temporal.

- **Complejidad técnica:** Muy alta. Esto ya no es solo visión por computadora, es ciencia de datos aplicada (series de tiempo, análisis espacial estadístico).
- **Conocimiento de dominio necesario:** Muy alto — un modelo predictivo mal interpretado o mal comunicado puede generar decisiones tácticas erróneas. Esta etapa requiere validación constante y no debería usarse como única fuente de decisión, sino como apoyo.
- **Curva de aprendizaje:** Muy alta. Realísticamente requiere a alguien con formación específica en ciencia de datos, no solo en programación.
- **Prerrequisito estricto:** solo tiene sentido intentarla después de tener **al menos 1–2 años** de datos históricos consistentes gracias a las etapas anteriores.

### Resumen de la hoja de ruta

| Etapa | Qué logra | Complejidad técnica | Conocimiento de dominio | Curva de aprendizaje | Cuándo empezar |
|---|---|:---:|:---:|:---:|---|
| 0. Recolección de datos | Base de todo lo demás | Baja | Alto | Baja | Ya en curso |
| 1. Reglas automáticas | Alertas y resúmenes simples | Baja-media | Alto | Baja | Se puede iniciar ahora |
| 2. Clasificación de imágenes | "¿Hay novedad o no, y de qué tipo?" | Media-alta | Alto | Alta | Cuando haya suficientes fotos etiquetadas (cientos–miles) |
| 3. Detección de objetos | "¿Dónde exactamente está la novedad?" | Alta | Alto | Alta (incremental sobre Etapa 2) | Después de dominar la Etapa 2 |
| 4. Predicciones | Estimar patrones futuros | Muy alta | Muy alto | Muy alta | Con 1–2+ años de historial |

---

## 5. Resumen y recomendación

1. **Corto plazo:** seguir usando SIMTRG tal como está (Etapa 0 de la hoja de ruta de ML) — cada foto y evento bien registrado hoy es lo que hace posible todo lo demás a futuro.
2. **Hosting:** si la prioridad es control total de los datos y bajo costo recurrente, un **servidor físico con Linux dentro de la unidad** es la opción recomendada. Si se prefiere no lidiar con mantenimiento de hardware y se acepta el costo mensual, un **VPS en la nube desde ~$5 USD/mes** (Hetzner) es viable técnicamente sin cambios al sistema actual.
3. **Machine Learning:** no es un interruptor que se enciende — es un camino de etapas. Lo más valioso que se puede hacer *hoy* para ese futuro no es contratar un experto en IA todavía, sino **mantener la disciplina de registro de datos** que ya se está construyendo.
