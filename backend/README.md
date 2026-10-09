# Backend — Consolas App

API REST en Node.js + Express (CommonJS) con MySQL/MariaDB (`mysql2/promise`), JWT, bcrypt y multer.

## Instalación
```bash
cd backend
npm install
cp .env.example .env      # y ajuste los valores (sobre todo JWT_SECRET)
npm run dev               # o: npm start
```
Requiere la base `consolas_db` creada con `database/schema.sql` y `database/seed.sql` (o, en una base existente de la fase 1, aplicar `database/migraciones/002_fase2.sql`).
Usuarios del seed: `admin / Admin123*`, `tecnico / Tecnico123*`, `operario / Operario123*`.

## Variables de entorno
| Variable | Por defecto | Descripción |
|---|---|---|
| DB_HOST / DB_PORT | localhost / 3306 | Servidor MySQL |
| DB_USER / DB_PASSWORD | root / (vacío) | Credenciales |
| DB_NAME | consolas_db | Base de datos |
| JWT_SECRET | — (obligatoria) | Secreto para firmar los tokens |
| JWT_EXPIRES | 8h | Vigencia del token |
| PORT | 3001 | Puerto HTTP (producción: 5173, lo pasa el lanzador) |
| HOST | 127.0.0.1 | Interfaz de escucha. Desarrollo: solo el propio PC (la red entra por el proxy de Vite). Producción: `0.0.0.0` |
| SERVIR_FRONTEND | (vacío) | `1` activa el **modo producción** (también `NODE_ENV=production`): sirve `frontend/dist`, compresión, cabeceras de seguridad con CSP y `trust proxy = loopback` |
| NODE_ENV | (vacío) | `production` equivale a `SERVIR_FRONTEND=1` (`test` lo usan las pruebas) |
| FRONTEND_DIST | `../frontend/dist` | Carpeta de la web compilada (normalmente no hace falta cambiarla) |
| CORS_ORIGIN | http://localhost:5173 | Orígenes permitidos (separados por coma) |
| TRUST_PROXY | vacío (desarrollo) / `loopback` (producción) | Valor de `trust proxy` de Express. Normalmente no se define: en producción se usa `loopback` (cloudflared corre en el mismo PC). |

Las variables que pasa el lanzador (`produccion.cmd`, `iniciar.bat`) tienen prioridad: dotenv no sobrescribe variables ya definidas, así que el `PORT=3001` del `.env` no afecta al modo producción.

## Scripts
- `npm start` — inicia la API (modo desarrollo salvo que el entorno diga otra cosa).
- `npm run dev` — inicia con nodemon (recarga al cambiar `src/`). Se usa junto con `npm run dev` del frontend (Vite en 5173 con proxy a 127.0.0.1:3001).
- `npm run start:prod` — **modo producción**: un solo servidor con API + web compilada en `0.0.0.0:5173` (equivale a `produccion.cmd`; las variables ya definidas tienen prioridad).
- `npm run verificar-claves` — revisa si algún usuario activo usa todavía una contraseña de ejemplo del seed (ver abajo).
- `npm test` — pruebas con `node --test` + supertest. Las de integración se saltan solas si no hay conexión a MySQL.

## Modo producción (un solo servidor)
```bat
cd frontend
npm run build
cd ..\backend
npm run start:prod
```
`npm run start:prod` (o `produccion.cmd`) equivale a `node src/server.js` con `SERVIR_FRONTEND=1`, `NODE_ENV=production`, `PORT=5173` y `HOST=0.0.0.0`. La red local entra por `http://<IP-del-PC>:5173` y `cloudflared tunnel --url http://localhost:5173` lo publica en internet.

- **Web**: sirve `frontend/dist`. Cualquier GET que no sea `/api/*` ni `/uploads/*` y no sea un archivo existente devuelve `index.html` (rutas de React como `/panel/consolas`). Un `/api` o `/uploads` inexistente sigue dando 404 JSON, y un `/assets/…` inexistente da 404 (no el HTML).
- **Caché**: `/assets/*` (nombres con hash) `Cache-Control: public, max-age=31536000, immutable`; `index.html` y demás archivos sueltos `no-cache` (siempre se revalida, así se ve el build nuevo).
- **Compresión** gzip/brotli (`compression`).
- Si `frontend/dist` no existe, la consola muestra un aviso con la instrucción `npm run build` y la web responde 503 con ese mensaje; la API sigue funcionando.
- **Cabeceras de seguridad** (helmet): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` y la CSP:
  `default-src 'self'; base-uri 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'`
  (sin `upgrade-insecure-requests`, porque la red local usa http). `Strict-Transport-Security` solo cuando la petición llega por HTTPS (`req.secure` o `X-Forwarded-Proto: https` desde loopback, es decir, desde cloudflared). En desarrollo no hay CSP (Vite usa scripts en línea); solo nosniff, X-Frame-Options y Referrer-Policy.
- **IP del cliente** (`src/utils/ipCliente.js`): si la conexión viene del propio PC (cloudflared) y trae `CF-Connecting-IP` válida, se usa esa IP; si viene de otro equipo de la red, se usa la IP de la conexión y se ignoran `CF-Connecting-IP` / `X-Forwarded-For`. En desarrollo todas las peticiones llegan por el proxy de Vite y cuentan como `127.0.0.1`.
- Los errores 500 se registran en la consola con fecha; el cliente nunca recibe el detalle.

## Seguridad del inicio de sesión y contraseñas
- **Límite de intentos de login** (en memoria): 5 intentos fallidos por IP + usuario y 20 por IP en 15 minutos → `429 {"error":"Demasiados intentos fallidos de inicio de sesión. Intenta de nuevo en unos minutos."}` con `Retry-After`. Mientras dure el bloqueo tampoco entra con la contraseña correcta. Un login correcto reinicia el contador de esa IP + usuario. Reiniciar el servidor limpia los contadores.
- **Mensaje genérico**: usuario inexistente, contraseña incorrecta o usuario inactivo → siempre `401 {"error":"Usuario o contraseña incorrectos"}`.
- **Política de contraseñas** al crear un usuario o cambiar su contraseña: 8 a 72 caracteres con al menos una letra y un número (`400 {"error":"La contraseña debe tener al menos 8 caracteres e incluir letras y números"}`). Las contraseñas ya guardadas siguen sirviendo hasta que se cambien.
- **`npm run verificar-claves`** (`scripts/verificar-claves.js`): lee `.env`, consulta los usuarios **activos** y compara su hash con las contraseñas del seed (`Admin123*`, `Tecnico123*`, `Operario123*`). Códigos de salida: `0` ninguna coincide; `1` hay usuarios con contraseña de ejemplo (los lista); `2` no se pudo consultar la base de datos. Lo usa `publicar.bat` para negarse a publicar. Mensajes sin tildes para la consola de Windows.

## Estructura
`src/app.js` (app sin listen; `crearApp({produccion, frontendDist, trustProxy})`) · `src/server.js` · `src/config/` (env, pool) · `src/middleware/` (auth, upload, errores, limiteIntentos, seguridad, frontend) · `scripts/` (verificar-claves, iniciar-produccion) · `src/routes/` · `src/controllers/` · `src/services/` (ventas, consolas, publico, negocio) · `src/utils/` (validación, errores HTTP, archivos) · `uploads/` · `tests/`

## Endpoints (prefijo `/api`, cabecera `Authorization: Bearer <token>`)
Errores: `{ "error": "mensaje" }` con 400 / 401 / 403 / 404 / 409 / 429 / 500 (503 si la BD no responde).

La conexión activa el modo estricto de SQL en cada sesión (`STRICT_TRANS_TABLES…`): un valor fuera de un ENUM o un texto demasiado largo da error en vez de guardarse truncado.

| Método | Ruta | Roles | Entrada → salida |
|---|---|---|---|
| POST | /auth/login | público | `{usuario, password}` → `{token, usuario:{id,nombre,usuario,rol}}`; 401 genérico; 429 tras demasiados fallos (ver arriba) |
| GET | /auth/me | todos | → usuario actual |
| GET | /usuarios | admin | → lista (sin hash) |
| POST | /usuarios | admin | `{nombre, usuario, password, rol}` → 201 usuario |
| PUT | /usuarios/:id | admin | `{nombre?, usuario?, password?, rol?, activo?}` → usuario |
| DELETE | /usuarios/:id | admin | desactiva (no a sí mismo) |
| GET | /clientes?q= | todos | busca por nombre, documento o teléfono |
| GET | /clientes/:id | todos | cliente + `consolas[]` |
| POST / PUT | /clientes, /clientes/:id | operario, admin | `{nombre, documento?, telefono?, email?, direccion?}` |
| GET | /consolas?estado=&q= | todos | lista con `cliente_nombre`, `tecnico_nombre`, `resultado_reparacion`, `necesita_repuestos` |
| GET | /consolas/:id | todos | consola (incluye `resultado_reparacion`, `diagnostico_resultado`, `necesita_repuestos`) + `cliente` + `fotos[]` + `procedimientos[]` (con `fotos[]`, `tecnico_nombre`, `interno`) + `repuestos[]` |
| POST | /consolas | operario, admin | multipart: `cliente_id, marca, modelo, falla_reportada, numero_serie?, color?, accesorios?, observaciones_recepcion?` + `fotos` (máx 10) → 201 detalle |
| PUT | /consolas/:id | operario, admin | mismos campos (JSON) → detalle |
| POST | /consolas/:id/fotos | operario, admin | multipart `fotos` → 201 detalle |
| PATCH | /consolas/:id/estado | tecnico, admin | `{estado}` → detalle |
| POST | /consolas/:id/procedimientos | tecnico, admin | multipart `descripcion, estado_resultante, interno?` (`1/0/true/false`, por defecto 0) + `fotos` → 201 `{procedimiento_id, consola}` |
| PUT | /consolas/:id/reparacion | tecnico, admin | `{resultado_reparacion: pendiente\|reparada\|no_reparable, diagnostico_resultado?, necesita_repuestos?}` → detalle. Si es técnico y la consola no tiene técnico, se le asigna. `diagnostico_resultado` o `necesita_repuestos` ausentes = no cambian (`diagnostico_resultado: ""` o `null` lo borra) |
| GET | /consolas/:id/repuestos | todos | → `[{id, consola_id, nombre, cantidad, costo_estimado, estado, notas, registrado_por, registrado_por_nombre, creado_en, actualizado_en}]` |
| POST | /consolas/:id/repuestos | tecnico, admin | `{nombre, cantidad (entero > 0), costo_estimado? (≥ 0), estado? (pendiente\|pedido\|conseguido), notas?}` → 201 repuesto; pone `necesita_repuestos = 1` |
| PUT | /consolas/:id/repuestos/:rid | tecnico, admin | mismos campos, **parcial** (solo los enviados) → repuesto |
| DELETE | /consolas/:id/repuestos/:rid | tecnico, admin | → `{mensaje}` |
| DELETE | /consolas/:id | admin | elimina la consola y sus archivos |
| GET | /articulos?q=&todos=1 | todos | catálogo (inactivos solo para admin con `todos=1`) |
| GET | /articulos/:id | todos | artículo |
| POST / PUT | /articulos, /articulos/:id | admin | multipart `nombre, precio, stock, descripcion?, categoria?, activo?, quitar_foto?` + `foto` |
| DELETE | /articulos/:id | admin | desactiva |
| GET | /ventas | operario, admin | lista con cliente, vendedor y `cantidad_articulos` |
| GET | /ventas/:id | operario, admin | venta + `items[]` |
| POST | /ventas | operario, admin | `{cliente_id?, items:[{articulo_id, cantidad}]}` → 201 venta |
| GET | /dashboard | todos | `{consolas_por_estado, total_consolas, ultimas_consolas, ventas_hoy:{cantidad,total}}` |
| GET | /negocio | admin | información del negocio (igual que la pública) |
| PUT | /negocio | admin | multipart o JSON, **parcial**: `nombre, eslogan, descripcion, direccion, telefono, whatsapp, email, horario, facebook, instagram, tiktok` + `logo` (imagen) + `quitar_logo` → negocio. Campo enviado vacío → null (salvo `nombre`). `whatsapp` se guarda solo con dígitos (se quitan `+`, espacios y guiones; 7-15 dígitos). Redes: URL `http(s)://`. Al reemplazar o quitar el logo se borra el archivo anterior |
| GET | /galeria | admin | todos los elementos (incluidos ocultos) con `subido_por_nombre` |
| POST | /galeria | admin | multipart `archivo` (JPG/PNG/WEBP ≤ 5 MB o MP4/WEBM ≤ 100 MB) + `titulo?, descripcion?, orden? (entero ≥ 0, def. 0), visible? (def. 1)` → 201 elemento. `tipo` (`foto`/`video`) se deduce del contenido real |
| PUT | /galeria/:id | admin | `{titulo?, descripcion?, orden?, visible?}` (parcial, sin cambiar archivo) → elemento |
| DELETE | /galeria/:id | admin | borra el registro y el archivo |

### Página pública (sin autenticación, prefijo `/api/publico`)
| Método | Ruta | Salida |
|---|---|---|
| GET | /publico/negocio | `{nombre, eslogan, descripcion, direccion, telefono, whatsapp, email, horario, facebook, instagram, tiktok, logo, actualizado_en}` |
| GET | /publico/galeria | `[{id, tipo, ruta, titulo, descripcion, orden, creado_en}]` solo visibles, por `orden` y luego `creado_en` desc |
| GET | /publico/articulos?q= | `[{id, nombre, descripcion, categoria, precio, foto, disponible (boolean)}]` solo activos; **sin stock** |
| POST | /publico/consulta | `{documento}` → `{cliente:{nombre_corto}, consolas:[…]}` (ver abajo) |

`POST /publico/consulta`: el documento se normaliza (sin espacios, puntos ni guiones) y se compara también normalizando la columna, así que encuentra documentos antiguos guardados con puntos (los clientes nuevos o editados ya se guardan normalizados). Respuestas: 400 sin documento; 404 `{"error":"No encontramos consolas registradas con ese documento"}` idéntico si no existe o no tiene consolas; 429 `{"error":"Demasiadas consultas. Intenta de nuevo en unos minutos."}` tras 10 consultas en 15 minutos por IP (contador en memoria, cabecera `Retry-After`). Cada consola (más reciente primero): `id, marca, modelo, color, serie_final (últimos 4; null si la serie tiene ≤ 4), falla_reportada, estado, fecha_ingreso, fecha_finalizacion, resultado_reparacion, diagnostico_resultado, necesita_repuestos (boolean), repuestos[{nombre, cantidad, costo_estimado, estado}], fotos[{ruta, descripcion}], procedimientos[{descripcion, estado_resultante, creado_en, fotos:[ruta]}]` (solo `interno = 0`, en orden cronológico). Nunca incluye teléfono, email, dirección, documento, serie completa, observaciones de recepción, notas de repuestos, usuarios internos ni procedimientos internos.

Archivos de galería: el contenido se comprueba por sus bytes (MP4: `ftyp` en los bytes 4-7; WEBM: `1A 45 DF A3`; imágenes: JPG/PNG/WEBP), no por la extensión. Un archivo falso renombrado a `.mp4` → 400 y no queda en disco.

Fotos: el campo puede llamarse `fotos` o `fotos[]`; solo JPG/PNG/WEBP, máx 5 MB c/u y 10 por petición. Se guardan en `uploads/` y se sirven en `/uploads/<archivo>` (en BD: `/uploads/<archivo>`). Si una petición falla, los archivos subidos se borran.

Reglas: precio y total de la venta se calculan en el servidor con el precio actual (transacción + `SELECT … FOR UPDATE`); si un técnico cambia el estado o registra un procedimiento queda asignado como `tecnico_id`; al pasar a `finalizado` se fija `fecha_finalizacion` y se limpia al volver a otro estado.
