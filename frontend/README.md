# Consolas App — Frontend

React + Vite + React Router, con CSS propio. Interfaz en español.
Incluye la **página pública** para clientes (tema claro con cabecera/hero oscuros) y el **panel interno** (tema oscuro).

## Requisitos
- Node.js 18 o superior
- Backend en ejecución en `http://localhost:3001` (ver `../backend/README.md`)

## Arrancar
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```
Vite reenvía `/api` y `/uploads` a `http://localhost:3001` (ver `vite.config.js`).

Usuario inicial: `admin` / `Admin123*`.

## Scripts
| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación (también con proxy) |
| `npm run lint` | ESLint |

## Rutas
| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | pública | Página principal: hero, servicios, galería de trabajos (fotos y videos con visor), productos destacados con "Lo quiero" por WhatsApp, contacto |
| `/productos` | pública | Catálogo completo con búsqueda, filtro por categoría y "solo disponibles" |
| `/consulta` | pública | Consulta del estado de la consola por número de documento |
| `/login` | pública | Acceso del personal (enlace "Acceso personal" en el pie) |
| `/panel`, `/panel/recepcion`, `/panel/consolas[/:id]`, `/panel/clientes[/:id]`, `/panel/catalogo`, `/panel/ventas[/nueva\|/:id]`, `/panel/usuarios` | con sesión | Aplicación interna (según rol) |
| `/panel/pagina-web` | administrador | Información del negocio (con logo) y gestor de la galería |

Las rutas internas antiguas (`/consolas`, `/clientes`, `/recepcion`, `/catalogo`, `/ventas`, `/usuarios` y subrutas) redirigen a su equivalente bajo `/panel`. Tras iniciar sesión se va a `/panel`; un 401 lleva a `/login`.

## Estructura
```
src/
├── api/client.js        fetch con token Bearer, JSON/FormData, 401 → cierra sesión; upload() con XMLHttpRequest (progreso)
├── context/             AuthProvider (login, logout, /auth/me, puede(accion))
├── components/          Layout, Sidebar, EstadoBadge, ResultadoBadge, ReporteReparacion, Modal, ConfirmDialog, ImageUploader, Galeria, …
│   ├── publico/         PublicLayout, ProductoCard, GaleriaTrabajos, ProgresoEstado, negocio.js (useNegocio)
│   └── web/             NegocioForm, GaleriaGestor (panel "Página web")
├── pages/               Login, Panel, Recepción, Consolas, Clientes, Catálogo, Ventas, Usuarios, PaginaWeb
│   └── publico/         Inicio, Productos, Consulta
└── utils/               permisos (matriz de roles), formato (COP, resultados, WhatsApp), hooks
```
Los permisos por rol están en `src/utils/permisos.js` y siguen `docs/ESPECIFICACION.md` y `docs/ESPECIFICACION-FASE2.md`
(nuevos: `web.gestionar` solo admin; `consolas.reparacion`, `consolas.repuestos`, `consolas.interno` para técnico y admin).

## Fase 2 — qué se ve dónde
- **Detalle de consola** (`/panel/consolas/:id`): sección "Reporte de reparación" (resultado, explicación, interruptor "Necesita repuestos" y lista de repuestos con cambio de estado y borrado). Técnico/admin editan; operario solo lee. El formulario de procedimiento tiene la casilla "Nota interna (el cliente no la verá)" y la línea de tiempo marca esos procedimientos como "Interno".
- **Lista de consolas**: columna "Reparación" con el resultado y la etiqueta "Repuestos".
- **API pública** consumida: `GET /api/publico/negocio`, `/publico/galeria`, `/publico/articulos`, `POST /publico/consulta` (404 y 429 con mensajes propios). La consulta envía el documento sin espacios, puntos ni guiones.
