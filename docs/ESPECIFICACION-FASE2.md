# Especificación — Fase 2: página pública y reporte de reparación

Amplía `ESPECIFICACION.md` (que sigue vigente). Contrato compartido entre agentes para esta fase.
La base de datos `consolas_db` ya tiene datos reales: **los cambios de esquema van en una migración** (`ALTER`), nunca recreando tablas.

## Resumen
1. **Página pública para clientes** (sin login): información del emprendimiento, galería de fotos y videos de trabajos, catálogo de productos y consulta del estado de su consola por número de documento.
2. **Administración de la página pública** (solo administrador): editar la información del negocio y gestionar la galería.
3. **Reporte de reparación del técnico**: si se pudo reparar o no, explicación, si necesita repuestos y la lista de repuestos.
4. **Notas internas**: un procedimiento puede marcarse como interno y el cliente no lo ve.

## Cambios en la base de datos (migración `database/migraciones/002_fase2.sql`)
- Nueva tabla **negocio** (una sola fila, id = 1): nombre, eslogan, descripcion (texto), direccion, telefono, whatsapp (solo dígitos con indicativo, ej. 573001234567), email, horario (texto), facebook, instagram, tiktok (URLs, opcionales), logo (ruta, null), actualizado_en. Insertar fila inicial con valores de ejemplo editables.
- Nueva tabla **galeria**: id, tipo ENUM('foto','video'), ruta, titulo, descripcion, orden INT default 0, visible TINYINT(1) default 1, subido_por → usuarios, creado_en, actualizado_en. Índice (visible, orden).
- **consolas** — columnas nuevas:
  - resultado_reparacion ENUM('pendiente','reparada','no_reparable') NOT NULL DEFAULT 'pendiente'
  - diagnostico_resultado TEXT NULL — explicación del técnico
  - necesita_repuestos TINYINT(1) NOT NULL DEFAULT 0
  - Índice en documento ya existe en clientes (UNIQUE), suficiente para la consulta pública.
- Nueva tabla **repuestos_consola**: id, consola_id → consolas (CASCADE), nombre, cantidad INT (>0), costo_estimado DECIMAL(12,2) NULL (≥0), estado ENUM('pendiente','pedido','conseguido') default 'pendiente', notas, registrado_por → usuarios, creado_en, actualizado_en. Índice (consola_id).
- **procedimientos** — columna nueva: interno TINYINT(1) NOT NULL DEFAULT 0.
- `schema.sql` también se actualiza para instalaciones nuevas (mismo resultado final que schema + migración).

## Permisos nuevos
| Acción | operario | tecnico | administrador |
|---|:-:|:-:|:-:|
| Editar información del negocio | ❌ | ❌ | ✅ |
| Gestionar galería (subir, editar, ocultar, ordenar, borrar) | ❌ | ❌ | ✅ |
| Reporte de reparación (resultado, explicación, necesita repuestos) | ❌ (solo ver) | ✅ | ✅ |
| Repuestos (crear, editar, borrar) | ❌ (solo ver) | ✅ | ✅ |
| Marcar procedimiento como interno | ❌ | ✅ | ✅ |

## API nueva
### Pública (sin autenticación) — prefijo `/api/publico`
| Método | Ruta | Descripción |
|---|---|---|
| GET | /publico/negocio | Información del negocio |
| GET | /publico/galeria | Elementos con visible = 1, ordenados por `orden`, luego `creado_en` desc |
| GET | /publico/articulos?q= | Artículos activos: id, nombre, descripcion, categoria, precio, foto, disponible (stock > 0). **No exponer el stock exacto**. |
| POST | /publico/consulta | body `{documento}` → `{cliente:{nombre_corto}, consolas:[...]}` |

**`POST /publico/consulta`**
- Busca el cliente por documento exacto (sin espacios ni puntos). Si no existe o no tiene consolas: 404 `{error:"No encontramos consolas registradas con ese documento"}` (mismo mensaje en ambos casos).
- `nombre_corto` = primer nombre solamente.
- Por consola: id, marca, modelo, color, falla_reportada, estado, fecha_ingreso, fecha_finalizacion, resultado_reparacion, diagnostico_resultado, necesita_repuestos, repuestos [{nombre, cantidad, costo_estimado, estado}], fotos de recepción [{ruta, descripcion}], procedimientos **con interno = 0** [{descripcion, estado_resultante, creado_en, fotos:[ruta]}], ordenadas de la más reciente a la más antigua.
- **Nunca** devolver: teléfono, email, dirección, documento, número de serie completo (mostrar solo los últimos 4 caracteres como `serie_final`), observaciones_recepcion, nombres de usuarios internos, procedimientos internos.
- **Límite de intentos**: máximo 10 consultas cada 15 minutos por IP (middleware en memoria, sin dependencias nuevas o con `express-rate-limit`). Al superar: 429 `{error:"Demasiadas consultas. Intenta de nuevo en unos minutos."}`.

### Administración (autenticadas)
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | /negocio | admin | Igual que la pública |
| PUT | /negocio | admin | multipart: campos de texto + `logo` opcional (imagen) + `quitar_logo` |
| GET | /galeria | admin | Todos los elementos (incluidos ocultos) |
| POST | /galeria | admin | multipart: `archivo` (imagen jpg/png/webp ≤ 5 MB **o** video mp4/webm ≤ 100 MB), titulo, descripcion, orden, visible. `tipo` se deduce del contenido real del archivo. |
| PUT | /galeria/:id | admin | Editar titulo, descripcion, orden, visible (sin cambiar archivo) |
| DELETE | /galeria/:id | admin | Borrar registro y archivo |
| PUT | /consolas/:id/reparacion | tecnico, admin | `{resultado_reparacion, diagnostico_resultado, necesita_repuestos}`. Si es técnico y la consola no tiene técnico, se le asigna. |
| GET | /consolas/:id/repuestos | todos | Lista |
| POST | /consolas/:id/repuestos | tecnico, admin | `{nombre, cantidad, costo_estimado?, estado?, notas?}`; pone necesita_repuestos = 1 |
| PUT | /consolas/:id/repuestos/:rid | tecnico, admin | Editar |
| DELETE | /consolas/:id/repuestos/:rid | tecnico, admin | Borrar |

Cambios en endpoints existentes:
- `GET /consolas/:id` incluye resultado_reparacion, diagnostico_resultado, necesita_repuestos, `repuestos` y `interno` en cada procedimiento.
- `GET /consolas` incluye resultado_reparacion y necesita_repuestos.
- `POST /consolas/:id/procedimientos` acepta `interno` ('1'/'0' o true/false), por defecto 0.

Archivos: videos validados por contenido real (mp4: bytes 4-7 = `ftyp`; webm: empieza por `1A 45 DF A3`), igual que las imágenes. Guardados en `backend/uploads/` y servidos en `/uploads/`. Al borrar o reemplazar, borrar el archivo anterior.

## Frontend
### Reorganización de rutas
- **Pública** (sin login): `/` página principal, `/productos` catálogo completo, `/consulta` consulta de consola. Enlace discreto "Acceso personal" → `/login`.
- **Aplicación interna**: se mueve bajo `/panel/*` (ej. `/panel`, `/panel/consolas/:id`, `/panel/recepcion`…). Tras iniciar sesión se va a `/panel`. Las rutas antiguas internas redirigen a su equivalente bajo `/panel` si es sencillo.

### Página principal (`/`)
Diseño atractivo y profesional, coherente con la temática gamer del panel pero pensado para clientes (puede ser más luminoso). Mobile first.
- Cabecera con logo/nombre y navegación (Inicio, Trabajos, Productos, Consulta tu consola, Contacto).
- Hero con nombre, eslogan, descripción y botones "Consulta tu consola" y "Escríbenos por WhatsApp" (`https://wa.me/<whatsapp>`).
- Servicios (mantenimiento, reparación, venta) — texto fijo razonable.
- Galería de trabajos: cuadrícula de fotos y videos (`<video controls preload="metadata">`), visor ampliado.
- Productos destacados (primeros 8) + enlace a `/productos`; precio en COP, etiqueta "Agotado" si no disponible, botón "Lo quiero" que abre WhatsApp con mensaje prellenado.
- Contacto: dirección, horario, teléfono, email, redes sociales.
- Los datos salen de `/api/publico/*`; estados de carga/vacío/error.

### Consulta (`/consulta`)
- Campo "Número de documento" → POST /publico/consulta.
- Por consola: tarjeta con marca/modelo, estado (badge con colores existentes), barra de progreso de 3 pasos (Recibida → En proceso → Finalizada), resultado de la reparación (Pendiente / Reparada / No reparable) con la explicación, repuestos necesarios (tabla), fotos de recepción y línea de tiempo de procedimientos con fotos.
- Mensajes claros para 404 y 429.

### Panel interno — cambios
- Nueva sección **"Página web"** (solo admin): formulario de información del negocio (con logo) y gestor de galería (subir foto/video con vista previa y barra de progreso de subida, editar título/descripción/orden, mostrar/ocultar, borrar con confirmación). Enlace "Ver página pública".
- **Detalle de consola**: nueva sección "Reporte de reparación":
  - técnico/admin: selector Pendiente / Reparada / No reparable, explicación, interruptor "Necesita repuestos" y lista de repuestos (añadir, editar estado, borrar).
  - operario: solo lectura.
- Formulario de procedimiento: casilla "Nota interna (el cliente no la verá)". En la línea de tiempo, los internos llevan una etiqueta "Interno".
- Lista de consolas: indicador si necesita repuestos y del resultado de reparación.
