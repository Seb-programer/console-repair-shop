# 001 — Esquema inicial

La migración 001 es el esquema de la fase 1: el `schema.sql` original (9 tablas: usuarios, clientes, consolas, fotos_consola, procedimientos, fotos_procedimiento, articulos, ventas, detalle_venta).

No existe un `001_inicial.sql` aparte porque `schema.sql` **borra y recrea** las tablas. Además, `schema.sql` se mantiene actualizado e incluye ya todas las migraciones posteriores (hoy, la 002).

Orden:
- **Instalación nueva**: `schema.sql` + `seed.sql`. No hace falta aplicar ninguna migración.
- **Base existente con datos** (creada con el esquema de la fase 1): aplicar en orden `002_fase2.sql`, `003_...`, etc. Nunca `schema.sql`.
