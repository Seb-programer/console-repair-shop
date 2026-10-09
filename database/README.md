# Base de datos — Consolas App

Motor: **MariaDB 10.4 (XAMPP)**, también compatible con MySQL 5.7+/8. Base `consolas_db`, `utf8mb4` / `utf8mb4_unicode_ci`, todas las tablas InnoDB.

| Archivo | Contenido |
|---|---|
| `schema.sql` | Crea la base (si no existe) y **borra y recrea** las 12 tablas. Se puede ejecutar varias veces. Ya incluye todas las migraciones (es el estado final). Solo para instalaciones nuevas. |
| `seed.sql` | Usuarios iniciales, fila de `negocio` y datos de ejemplo. Ejecutar siempre **después** de `schema.sql`. |
| `migraciones/001_inicial.md` | Nota: la 001 es el esquema de la fase 1 (`schema.sql` original). |
| `migraciones/002_fase2.sql` | Fase 2 sobre una base existente: tablas `negocio`, `galeria`, `repuestos_consola`; columnas nuevas en `consolas` y `procedimientos`. No borra datos. Idempotente. |

> ⚠️ `schema.sql` hace `DROP TABLE IF EXISTS` de todas las tablas de `consolas_db`: **se pierden los datos**. No lo ejecutes en una base con datos reales sin hacer antes un respaldo (ver más abajo). No toca otras bases.

## Instalación nueva o base existente

| Situación | Qué ejecutar |
|---|---|
| Instalación nueva (base vacía o de pruebas) | `schema.sql` y luego `seed.sql`. No hace falta ninguna migración. |
| Base con datos reales creada en la fase 1 | Solo las migraciones pendientes, en orden (`002_fase2.sql`, …). **Nunca `schema.sql`**. |

### Aplicar migraciones
1. Respaldo previo (obligatorio):
   ```powershell
   cmd /c "C:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction --routines consolas_db > %TEMP%\consolas_db_antes_migracion.sql"
   ```
2. Aplicar (desde la carpeta `database`):
   ```powershell
   cmd /c "C:\xampp\mysql\bin\mysql.exe -u root consolas_db < migraciones\002_fase2.sql"
   ```
   o en phpMyAdmin: seleccionar `consolas_db` → **Importar** → `002_fase2.sql`.
3. Verificar:
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root consolas_db -e "SHOW TABLES; DESCRIBE consolas; SELECT nombre, whatsapp FROM negocio;"
   ```

Las migraciones usan `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` e `INSERT IGNORE`: ejecutarlas otra vez no cambia nada (solo muestra *notes* 1050/1060/1061 y el *warning* 1062 con `--show-warnings`). La fila de `negocio` no se sobrescribe si ya se editó. La reversión (destructiva) está comentada al inicio de cada migración.

No hay tabla de control de versiones del esquema: para saber si la 002 está aplicada, comprobar `SHOW TABLES LIKE 'negocio';`.

## Cómo importar (instalación nueva)

Arranca MySQL desde el panel de XAMPP (botón *Start* de MySQL).

### Opción A: phpMyAdmin
1. Abre http://localhost/phpmyadmin
2. Pestaña **Importar** → selecciona `schema.sql` → **Continuar** (no hace falta elegir base: el script la crea y hace `USE`).
3. Repite con `seed.sql`.

### Opción B: consola (PowerShell o CMD)
```powershell
cd C:\Users\XllxSeBaSxllX\Documents\consolas-app\database
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root < schema.sql"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root < seed.sql"
```
(En CMD o Git Bash funciona directamente `C:\xampp\mysql\bin\mysql.exe -u root < schema.sql`; PowerShell no admite `<`, por eso el `cmd /c`.)

Verificación:
```powershell
C:\xampp\mysql\bin\mysql.exe -u root consolas_db -e "SHOW TABLES; SELECT usuario, rol FROM usuarios;"
```

### Usuarios de ejemplo
| usuario | contraseña | rol |
|---|---|---|
| `admin` | `Admin123*` | administrador |
| `tecnico` | `Tecnico123*` | tecnico |
| `operario` | `Operario123*` | operario |

Hashes bcrypt reales (cost 10, generados con `bcryptjs`, prefijo `$2b$`, compatibles con `bcryptjs.compare`). Cámbialos fuera de desarrollo.

Datos de ejemplo: 2 clientes (Juan Perez tiene documento `1012345678`; Maria Gomez no tiene documento), 2 consolas (la 1 de Juan, `en_espera` sin técnico; la 2 de Maria, `en_proceso` asignada a `tecnico`, con `necesita_repuestos = 1`, diagnóstico y 1 repuesto en estado `pedido`), 2 procedimientos sobre la consola 2 (uno visible y uno **interno**), 4 artículos (Control DualSense, Cable HDMI 2.1, Pasta térmica, PS4 Slim reacondicionada) y la fila `negocio` id = 1 con datos de ejemplo ("Consolas Pro Service", WhatsApp `573000000000`). No hay ventas ni elementos de galería de ejemplo (la galería necesita archivos reales en `backend/uploads/`).

Para probar la consulta pública usa el documento `1012345678` (consola 1). La consola 2, que tiene repuestos y la nota interna, no se puede consultar públicamente porque Maria Gomez no tiene documento: para probarla, asígnale uno desde el panel.

## Diagrama de relaciones

```
clientes 1 ──< N consolas 1 ──< N fotos_consola
   │                  ├─────< N procedimientos 1 ──< N fotos_procedimiento
   │                  └─────< N repuestos_consola
   │
   └─(0..1) ──< N ventas 1 ──< N detalle_venta N >── 1 articulos

usuarios 1 ──< N consolas.recibido_por / consolas.tecnico_id (0..1)
usuarios 1 ──< N fotos_consola.subido_por
usuarios 1 ──< N procedimientos.tecnico_id
usuarios 1 ──< N ventas.usuario_id
usuarios 1 ──< N galeria.subido_por
usuarios 1 ──< N repuestos_consola.registrado_por

negocio  (tabla de una sola fila, id = 1, sin relaciones)
```

En forma de lista (hija.columna → padre, regla ON DELETE):
- `consolas.cliente_id` → `clientes` — RESTRICT
- `consolas.recibido_por` → `usuarios` — RESTRICT
- `consolas.tecnico_id` → `usuarios` (NULL) — SET NULL
- `fotos_consola.consola_id` → `consolas` — **CASCADE** (especificación)
- `fotos_consola.subido_por` → `usuarios` — RESTRICT
- `procedimientos.consola_id` → `consolas` — **CASCADE** (especificación)
- `procedimientos.tecnico_id` → `usuarios` — RESTRICT
- `fotos_procedimiento.procedimiento_id` → `procedimientos` — **CASCADE** (especificación)
- `ventas.cliente_id` → `clientes` (NULL) — SET NULL
- `ventas.usuario_id` → `usuarios` — RESTRICT
- `detalle_venta.venta_id` → `ventas` — **CASCADE** (especificación)
- `detalle_venta.articulo_id` → `articulos` — RESTRICT
- `repuestos_consola.consola_id` → `consolas` — **CASCADE** (especificación fase 2)
- `repuestos_consola.registrado_por` → `usuarios` — RESTRICT
- `galeria.subido_por` → `usuarios` — RESTRICT

Todas con `ON UPDATE CASCADE` (los ids no se modifican en la práctica).

## Decisiones de diseño

**Reglas de borrado (ON DELETE)**
- **CASCADE** solo donde lo pide la especificación: fotos y procedimientos pertenecen a la consola, fotos de procedimiento al procedimiento, y el detalle a la venta. Borrar el padre (acción de administrador) elimina sus dependientes. Ojo: los **archivos** de `backend/uploads/` no se borran con el CASCADE; el backend debe leer las rutas antes del `DELETE` y eliminarlos.
- **RESTRICT en referencias a `usuarios`**: los usuarios nunca se borran, se desactivan (`activo = 0`, como dice la API). RESTRICT impide perder la trazabilidad de quién recibió una consola, hizo un procedimiento o registró una venta.
- **SET NULL en `consolas.tecnico_id`**: la columna ya es opcional (consola sin técnico asignado), así que si un técnico llegara a borrarse, la consola queda "sin asignar" en vez de bloquear el borrado.
- **RESTRICT en `consolas.cliente_id`**: borrar un cliente no debe hacer desaparecer en silencio consolas que están en el taller ni su historial. Para borrar un cliente hay que borrar antes sus consolas (el backend debe responder 409 si la FK lo impide; error MySQL 1451).
- **SET NULL en `ventas.cliente_id`**: la venta es un registro contable que debe conservarse; el cliente ya es opcional (venta de mostrador), así que la venta queda como "sin cliente".
- **RESTRICT en `detalle_venta.articulo_id`**: los artículos se desactivan (`activo = 0`), no se borran; así el historial de ventas nunca pierde el artículo vendido.

**Fase 2 (migración 002)**

| Tabla | Cambio |
|---|---|
| `negocio` (nueva) | `id` (siempre 1), `nombre`, `eslogan`, `descripcion` TEXT, `direccion`, `telefono`, `whatsapp` VARCHAR(20), `email`, `horario`, `facebook`, `instagram`, `tiktok`, `logo` (ruta o NULL), `actualizado_en`. `CHECK (id = 1)` impide una segunda fila: el backend solo hace `SELECT ... WHERE id = 1` y `UPDATE ... WHERE id = 1`. `CHECK` de `whatsapp`: NULL o solo dígitos (7–15); el backend debe quitar `+`, espacios y guiones antes de guardar, y convertir cadenas vacías en NULL. |
| `galeria` (nueva) | `id`, `tipo` ENUM('foto','video'), `ruta`, `titulo`, `descripcion`, `orden` INT DEFAULT 0, `visible` TINYINT(1) DEFAULT 1, `subido_por` → usuarios, `creado_en`, `actualizado_en`. Índice `(visible, orden, creado_en)`. |
| `repuestos_consola` (nueva) | `id`, `consola_id` → consolas (CASCADE), `nombre`, `cantidad` INT UNSIGNED DEFAULT 1 (`CHECK > 0`), `costo_estimado` DECIMAL(12,2) NULL (`CHECK >= 0`), `estado` ENUM('pendiente','pedido','conseguido') DEFAULT 'pendiente', `notas`, `registrado_por` → usuarios, `creado_en`, `actualizado_en`. Índice `(consola_id)`. |
| `consolas` | + `resultado_reparacion` ENUM('pendiente','reparada','no_reparable') NOT NULL DEFAULT 'pendiente', + `diagnostico_resultado` TEXT NULL, + `necesita_repuestos` TINYINT(1) NOT NULL DEFAULT 0. Las consolas existentes quedan en `pendiente` / 0. |
| `procedimientos` | + `interno` TINYINT(1) NOT NULL DEFAULT 0 e índice `(consola_id, interno, creado_en)`. Los procedimientos existentes quedan visibles (0). |

- Al borrar una consola, sus repuestos se borran en cascada (igual que fotos y procedimientos). Los archivos de la galería y del logo no se borran con la fila: el backend debe eliminarlos.
- La consulta pública por documento usa el UNIQUE `clientes(documento)`; no hace falta otro índice.

**Modo SQL de XAMPP (importante para el backend)**: el servidor tiene `sql_mode = NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION` (sin `STRICT_TRANS_TABLES`). En ese modo un valor de ENUM inválido (p. ej. `tipo = 'gif'` o `estado = 'otro'`) **no da error**: se guarda `''` con un *warning*, y los textos demasiado largos se truncan. Los `CHECK` y las FKs sí se aplican. El backend debe validar los ENUM con listas blancas antes de escribir, o activar el modo estricto por conexión (en `mysql2`, ejecutar `SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'` en cada conexión nueva del pool).

**Tipos y restricciones**
- Ids `INT UNSIGNED AUTO_INCREMENT`; FKs del mismo tipo.
- Fechas en `DATETIME` (no `TIMESTAMP`): no dependen de la zona horaria de la sesión ni tienen el límite de 2038. `creado_en`/`fecha_ingreso`/`fecha` tienen `DEFAULT CURRENT_TIMESTAMP`; `actualizado_en` añade `ON UPDATE CURRENT_TIMESTAMP`. Se recomienda que `mysql2` use `dateStrings` o `timezone: 'local'` de forma consistente.
- Dinero en `DECIMAL(12,2)` (nunca FLOAT). `detalle_venta` guarda `precio_unitario` y `subtotal` históricos (desnormalización intencionada: el precio del artículo puede cambiar después de la venta). `ventas.total` también se guarda calculado.
- `CHECK` (MariaDB ≥ 10.2 los aplica): `precio >= 0`, `stock >= 0`, `total >= 0`, `cantidad > 0`. El CHECK de stock es una red de seguridad: si una venta intenta dejar stock negativo, el `UPDATE` falla (error 4025) y la transacción debe hacer rollback; aun así el backend debe validar stock con `SELECT ... FOR UPDATE` antes de descontar.
- `clientes.documento` es `UNIQUE` y opcional: un índice UNIQUE admite múltiples `NULL`. El backend debe convertir cadenas vacías en `NULL` (si no, dos clientes con documento `''` chocan) y responder 409 ante duplicados (error 1062). Lo mismo con `usuarios.usuario`.
- `activo` es `TINYINT(1)` (mysql2 lo devuelve como 0/1).
- `falla_reportada` es `NOT NULL` (es el dato esencial de la recepción); `accesorios` y `observaciones_recepcion` son opcionales.

**Índices (según las consultas de la API)**
| Consulta | Índice |
|---|---|
| `GET /consolas?estado=` y conteo por estado del panel | `consolas(estado, fecha_ingreso)` |
| Últimas consolas del panel | `consolas(fecha_ingreso)` |
| Consolas de un cliente (`GET /clientes/:id`) | `consolas(cliente_id, fecha_ingreso)` |
| Búsqueda `q=` en consolas por número de serie | `consolas(numero_serie)` |
| `GET /clientes?q=` por nombre / documento / teléfono | `clientes(nombre)`, UNIQUE `clientes(documento)`, `clientes(telefono)` |
| Procedimientos de una consola en orden (línea de tiempo) | `procedimientos(consola_id, creado_en)` |
| Historial de ventas y ventas del día | `ventas(fecha)` |
| Catálogo de activos | `articulos(activo, nombre)` |
| Galería pública (`visible = 1 ORDER BY orden, creado_en`) | `galeria(visible, orden, creado_en)` |
| Repuestos de una consola | `repuestos_consola(consola_id)` |
| Línea de tiempo pública (`consola_id = ? AND interno = 0 ORDER BY creado_en`) | `procedimientos(consola_id, interno, creado_en)` |
| Consulta pública por documento | UNIQUE `clientes(documento)` |
| Login | UNIQUE `usuarios(usuario)` |

Los índices B-tree solo se aprovechan con búsquedas por prefijo (`LIKE 'texto%'`). Un `LIKE '%texto%'` recorre la tabla; con el volumen de un taller es aceptable. Si crece mucho, considerar un índice `FULLTEXT` en `clientes(nombre)`. Para "ventas del día" usar un rango (`fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY`) en lugar de `DATE(fecha) = CURDATE()`, para que use el índice.

## Usuario MySQL dedicado (recomendado, no ejecutado)

En XAMPP `root` no tiene contraseña: no lo uses desde la aplicación. Crea un usuario solo con permisos de datos sobre `consolas_db` (sin DROP, ALTER, CREATE ni GRANT):

```sql
CREATE USER 'consolas_app'@'localhost' IDENTIFIED BY 'CambiaEstaClave_Segura123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON consolas_db.* TO 'consolas_app'@'localhost';
FLUSH PRIVILEGES;
```

Y en `backend/.env`: `DB_USER=consolas_app`, `DB_PASSWORD=...`. Los cambios de esquema (`schema.sql` y migraciones) se siguen ejecutando con `root`. Se recomienda también poner contraseña a `root` en phpMyAdmin (*Cuentas de usuarios*).

## Respaldo y restauración
```powershell
cmd /c "C:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction --routines consolas_db > respaldo_consolas.sql"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root consolas_db < respaldo_consolas.sql"
```
Respalda también la carpeta `backend/uploads/` (las fotos no están en la base, solo sus rutas).
