# Datos de demostración (video de portafolio)

Base **`consolas_demo`**, separada de la base real `consolas_db` (que no se toca). Los datos están inventados: nombres de Colombia, precios en COP, documentos `100000000x`, teléfonos `300000xxxx`, correos `@example.com`, dirección con `# 00-00`. Las fechas son relativas a `NOW()`, así que la demo siempre parece reciente (ingresos de las últimas 3 semanas).

| Archivo | Contenido |
|---|---|
| `demo.sql` | Sustituye a `seed.sql`. Hace `USE consolas_demo`, **vacía las 12 tablas** (TRUNCATE) y las vuelve a llenar. Se puede ejecutar varias veces seguidas. |
| `fotos/` | 38 imágenes (`demo-*.jpg` de 1200x900 y `demo-logo.png` de 512x512, de 32 a 123 KB). Son ilustraciones generadas (SVG/HTML renderizado), no fotos descargadas, así que no hay problemas de licencia. |
| `generar-fotos.mjs` | Script que las genera (Playwright + Edge): `node generar-fotos.mjs <carpeta-salida> [filtro-regex]`. Necesita `playwright-core` instalado en la carpeta desde la que se ejecuta; no forma parte de la app. |

## Credenciales

| usuario | contraseña | rol | nombre |
|---|---|---|---|
| `admin` | `Demo1234` | administrador | Camilo Vargas |
| `tecnico` | `Demo1234` | tecnico | Andrés Rojas |
| `operario` | `Demo1234` | operario | Valentina Díaz |

Hashes bcrypt reales (cost 10, `bcryptjs`, verificados con `compareSync`).

## Qué contiene

- **Negocio**: "Consolas Pro Service", eslogan, descripción, dirección en Chapinero (Bogotá), horario, WhatsApp `573000000000`, `contacto@example.com`, redes de ejemplo y logo `/uploads/demo-logo.png`.
- **8 clientes** (7 con documento y uno sin documento: Nicolás Gutiérrez, venta de mostrador).
- **10 consolas**:

| id | Consola | Cliente (documento) | Estado | Resultado | Falla |
|---|---|---|---|---|---|
| 1 | PlayStation 5 | Laura Martínez (`1000000001`) | en_proceso | pendiente | No da imagen por HDMI |
| 2 | Switch OLED | Juan Camilo Pérez (`1000000002`) | finalizado | reparada | Drift en el joystick izquierdo |
| 3 | PS4 Slim | Daniela Ospina (`1000000003`) | finalizado | reparada | Se sobrecalienta |
| 4 | Xbox Series X | Carlos Andrés Muñoz (`1000000004`) | en_proceso | pendiente | No lee discos |
| 5 | Xbox One | Mariana Castillo (`1000000005`) | finalizado | no_reparable | No enciende (corto en la APU) |
| 6 | PS Vita | Felipe Ramírez (`1000000006`) | en_espera | pendiente | Pantalla táctil no responde |
| 7 | Switch | Sofía Herrera (`1000000007`) | en_espera | pendiente | No carga |
| 8 | Xbox Series S | Sofía Herrera (`1000000007`) | en_proceso | pendiente | Ventilador ruidoso |
| 9 | PS4 Pro | Nicolás Gutiérrez (sin doc.) | en_espera | pendiente | Se apaga y ventilador ruidoso (ingresó hace 4 horas) |
| 10 | Switch Lite | Laura Martínez (`1000000001`) | finalizado | reparada | Drift en el joystick izquierdo |

- **15 procedimientos** (3 son notas internas: en las consolas 1, 4 y 8), **7 fotos de procedimiento**, **11 fotos de recepción**, **7 repuestos** (pendiente / pedido / conseguido, de $15.000 a $180.000).
- **12 artículos** en 5 categorías (Controles, Cables, Repuestos, Consolas reacondicionadas, Accesorios), todos con foto. **Agotados** (stock 0): "Par de Joy-Con neón" y "Ventilador para PS4 Slim".
- **3 ventas** (hace 6 días, hace 2 días de mostrador, y una de **hoy** de $1.499.900, para que el panel muestre ventas del día). El stock de los artículos ya está descontado.
- **Galería**: 7 fotos; la 7 ("Insumos de calidad") está **oculta** para mostrar el interruptor de visibilidad en el panel.

## Documentos para cada escena del video

| Escena | Qué usar |
|---|---|
| Consulta pública con seguimiento completo | **`1000000001`** (Laura): PS5 **en_proceso** con diagnóstico, 2 fotos de recepción, 3 procedimientos visibles con foto, 1 repuesto "pedido" ($45.000) y 1 nota interna que **no** aparece en la consulta. También sale su Switch Lite finalizada y reparada. |
| Consola reparada y finalizada | `1000000002` (Switch OLED) o `1000000003` (PS4 Slim) |
| Consola no reparable | `1000000005` (Xbox One) |
| Repuesto pedido + pendiente | `1000000004` (Xbox Series X) |
| Recién recibida, sin técnico | `1000000006` (PS Vita) |
| Documento sin consolas (mensaje de error) | `1000000099` (no existe) |
| Recepción nueva en vivo | Crear un cliente nuevo; los documentos `1000000001`–`1000000007` ya están ocupados. |

En el panel, `tecnico` tiene asignadas las consolas 1, 2, 3, 4, 8 y 10; la 5 la atendió `admin`. Las consolas 6, 7 y 9 están sin técnico.

## Cómo se carga

Lo hace el lanzador `iniciar-demo.bat` de la raíz:

1. Recrear `consolas_demo`: `schema.sql` con `consolas_db` sustituido por `consolas_demo` **en la tubería** (sin modificar el archivo) y después `demo.sql`.
2. Vaciar `backend/uploads-demo` y copiar dentro el contenido de `database/demo/fotos/`.
3. Arrancar el servidor con `DB_NAME=consolas_demo`, `UPLOADS_DIR=uploads-demo` y el puerto 5174.

Comandos probados (desde la raíz del proyecto, en CMD):

```bat
powershell -NoProfile -Command "(Get-Content -Raw 'database\schema.sql') -replace 'consolas_db','consolas_demo' | & 'C:\xampp\mysql\bin\mysql.exe' -u root"
C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\demo\demo.sql
```

`schema.sql` es ASCII puro, así que pasarlo por la tubería de PowerShell es seguro. `demo.sql` lleva tildes: debe ir por redirección `<` con `--default-character-set=utf8mb4` (no por la tubería de PowerShell 5.1, que corrompería la codificación).

Con Git Bash: `sed 's/consolas_db/consolas_demo/g' database/schema.sql | mysql -u root`.

> `demo.sql` solo trabaja sobre `consolas_demo` (`USE consolas_demo` al inicio). No lo ejecutes contra otra base: vacía todas las tablas.

Las rutas de la base son `/uploads/demo-*.jpg|png`: el servidor las sirve desde la carpeta `UPLOADS_DIR`, así que basta con copiar `fotos/` tal cual. Para regenerar las imágenes, ejecuta `generar-fotos.mjs` (los nombres de archivo no deben cambiar).
