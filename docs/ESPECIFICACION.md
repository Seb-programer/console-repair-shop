# Especificación — Consolas App

Aplicación web para administrar un emprendimiento de mantenimiento, reparación y venta de consolas de videojuegos.
Este documento es el **contrato compartido** entre los agentes. Si algo debe cambiar, se cambia aquí primero.

## Stack
- **Base de datos:** MySQL / MariaDB (XAMPP). Base `consolas_db`, charset `utf8mb4`.
- **Backend:** Node.js + Express (CommonJS), `mysql2/promise`, `bcryptjs`, `jsonwebtoken`, `multer`, `dotenv`, `cors`. Puerto **3001**.
- **Frontend:** React + Vite + React Router. Puerto **5173**, con proxy de `/api` y `/uploads` hacia `http://localhost:3001`.
- Interfaz **en español**.

## Estructura de carpetas
```
consolas-app/
├── database/   schema.sql, seed.sql, README.md
├── backend/    src/ (app.js, server.js, config/, middleware/, routes/, controllers/, services/), uploads/, tests/, .env.example
├── frontend/   src/ (api/, components/, pages/, context/)
└── docs/       ESPECIFICACION.md
```

## Roles y permisos
| Acción | operario | tecnico | administrador |
|---|:-:|:-:|:-:|
| Iniciar sesión / ver su perfil | ✅ | ✅ | ✅ |
| Ver panel (resumen) | ✅ | ✅ | ✅ |
| Crear / editar clientes | ✅ | ❌ | ✅ |
| Ver clientes | ✅ | ✅ | ✅ |
| Recibir consola (crear registro + fotos de recepción) | ✅ | ❌ | ✅ |
| Ver consolas y su historial | ✅ | ✅ | ✅ |
| Registrar procedimientos (con fotos) y cambiar estado | ❌ | ✅ | ✅ |
| Ver catálogo de artículos | ✅ | ✅ | ✅ |
| Crear / editar / desactivar artículos | ❌ | ❌ | ✅ |
| Registrar ventas | ✅ | ❌ | ✅ |
| Ver ventas | ✅ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Eliminar registros | ❌ | ❌ | ✅ |

## Modelo de datos (tablas)
- **usuarios**: id, nombre, usuario (único), password_hash, rol ENUM('administrador','tecnico','operario'), activo, creado_en, actualizado_en
- **clientes**: id, nombre, documento (único, opcional), telefono, email, direccion, creado_en, actualizado_en
- **consolas**: id, cliente_id → clientes, marca, modelo, numero_serie, color, accesorios (texto), falla_reportada (texto), observaciones_recepcion, estado ENUM('en_espera','en_proceso','finalizado') por defecto 'en_espera', recibido_por → usuarios, tecnico_id → usuarios (null), fecha_ingreso, fecha_finalizacion (null), actualizado_en
- **fotos_consola**: id, consola_id → consolas (ON DELETE CASCADE), ruta, descripcion, subido_por → usuarios, creado_en  *(fotos de recepción)*
- **procedimientos**: id, consola_id → consolas (CASCADE), tecnico_id → usuarios, descripcion (texto), estado_resultante ENUM(igual que consolas), creado_en
- **fotos_procedimiento**: id, procedimiento_id → procedimientos (CASCADE), ruta, creado_en
- **articulos**: id, nombre, descripcion, categoria, precio DECIMAL(12,2), stock INT, foto (ruta, null), activo, creado_en, actualizado_en
- **ventas**: id, cliente_id → clientes (null), usuario_id → usuarios, total DECIMAL(12,2), fecha
- **detalle_venta**: id, venta_id → ventas (CASCADE), articulo_id → articulos, cantidad, precio_unitario DECIMAL(12,2), subtotal DECIMAL(12,2)

Usuario inicial (seed): `admin` / `Admin123*` con rol administrador (hash bcrypt).

## API REST (prefijo `/api`, JSON, autenticación `Authorization: Bearer <JWT>`)
Errores: `{ "error": "mensaje" }` con 400 / 401 / 403 / 404 / 409 / 500.

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | /auth/login | público | body `{usuario, password}` → `{token, usuario:{id,nombre,usuario,rol}}` |
| GET | /auth/me | todos | usuario actual |
| GET/POST | /usuarios | admin | listar / crear `{nombre, usuario, password, rol}` |
| PUT | /usuarios/:id | admin | editar (password opcional, activo) |
| DELETE | /usuarios/:id | admin | desactivar (no puede desactivarse a sí mismo) |
| GET | /clientes?q= | todos | listar / buscar por nombre, documento o teléfono |
| GET | /clientes/:id | todos | detalle + sus consolas |
| POST / PUT | /clientes, /clientes/:id | operario, admin | crear / editar |
| GET | /consolas?estado=&q= | todos | listar con nombre del cliente y técnico |
| GET | /consolas/:id | todos | detalle + cliente + fotos + procedimientos (con fotos y técnico) |
| POST | /consolas | operario, admin | **multipart**: campos de consola + `cliente_id` + `fotos[]` (máx 10) |
| PUT | /consolas/:id | operario, admin | editar datos de recepción |
| POST | /consolas/:id/fotos | operario, admin | multipart `fotos[]` |
| PATCH | /consolas/:id/estado | tecnico, admin | `{estado}`; asigna tecnico_id si es técnico; fija fecha_finalizacion al finalizar |
| POST | /consolas/:id/procedimientos | tecnico, admin | multipart: `descripcion`, `estado_resultante`, `fotos[]`; actualiza el estado de la consola |
| DELETE | /consolas/:id | admin | eliminar |
| GET | /articulos?q=&todos=1 | todos | catálogo (solo activos salvo `todos=1` para admin) |
| POST / PUT | /articulos, /articulos/:id | admin | multipart con `foto` opcional |
| DELETE | /articulos/:id | admin | desactivar |
| GET | /ventas | operario, admin | listar ventas |
| GET | /ventas/:id | operario, admin | detalle |
| POST | /ventas | operario, admin | `{cliente_id?, items:[{articulo_id, cantidad}]}`; en transacción: valida stock, usa precio actual, descuenta stock |
| GET | /dashboard | todos | conteo de consolas por estado, últimas consolas, ventas del día |

Fotos: solo imágenes (jpg, png, webp), máx 5 MB, guardadas en `backend/uploads/` y servidas en `/uploads/<archivo>`. En BD se guarda la ruta relativa `/uploads/<archivo>`.

## Pantallas (frontend)
- Login
- Panel: tarjetas por estado (en espera / en proceso / finalizado), últimas consolas
- Recepción: buscar o crear cliente → datos de la consola → fotos (vista previa) → guardar
- Consolas: lista con filtro por estado y búsqueda; detalle con datos, galería de fotos, línea de tiempo de procedimientos y formulario de procedimiento (técnico/admin)
- Clientes: lista, crear/editar, detalle con sus consolas
- Catálogo: tarjetas de artículos; admin crea/edita
- Ventas: nueva venta (carrito con artículos del catálogo) e historial
- Usuarios (solo admin)
- El menú muestra solo las secciones permitidas para el rol.
