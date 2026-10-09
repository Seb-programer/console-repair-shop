# Especificación — Fase 3: modo producción y publicación con Cloudflare Tunnel

Amplía `ESPECIFICACION.md` y `ESPECIFICACION-FASE2.md`. Objetivo: publicar la app en internet desde el PC del usuario con un túnel de Cloudflare (`cloudflared`), primero un túnel temporal (`trycloudflare.com`) y en el futuro un túnel con dominio propio (homelab).

## Arquitectura en producción
- **Un solo servidor Node** (Express) sirve la API (`/api`), los archivos (`/uploads`) y el frontend compilado (`frontend/dist`), con *fallback* a `index.html` para las rutas de React (todo lo que no sea `/api/*` ni `/uploads/*`).
- Escucha en **`0.0.0.0:5173`** en producción, para que la red local siga usando la misma dirección `http://<IP-del-PC>:5173` y la regla de firewall existente (TCP 5173, red privada, subred local).
- `cloudflared` corre en el mismo PC y apunta a `http://localhost:5173`.
- El modo desarrollo (Vite en 5173 + API en 127.0.0.1:3001) se conserva para trabajar en el código.
- Activación: variable `SERVIR_FRONTEND=1` (o `NODE_ENV=production`), junto con `PORT=5173` y `HOST=0.0.0.0`, pasadas por el lanzador. dotenv no sobrescribe variables ya definidas.

## Endurecimiento (obligatorio antes de exponer a internet)
1. **IP real del cliente**: `app.set('trust proxy', 'loopback')` en producción. Si la petición llega desde loopback (cloudflared) y trae `CF-Connecting-IP`, usar esa IP para los límites de intentos; si llega desde la red local, usar la IP de la conexión (ignorar cabeceras que mande un equipo de la LAN). Centralizar en una función `ipCliente(req)`.
2. **Límite de intentos de login**: máx. 5 intentos fallidos por IP + usuario en 15 min y 20 por IP en 15 min → 429 con mensaje en español. Un login correcto reinicia el contador de esa IP + usuario.
3. **Mensaje de login genérico**: un usuario inactivo recibe el mismo 401 "Usuario o contraseña incorrectos" (hoy revela que la contraseña es correcta).
4. **Cabeceras de seguridad** en producción: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (o CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` básica, y una **Content-Security-Policy** compatible con la app: scripts y estilos propios, Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), imágenes y videos propios + `data:` + `blob:` (vistas previas). Puede usarse `helmet` configurado. HSTS solo si la petición llega por HTTPS (Cloudflare).
5. **Compresión** de respuestas (`compression`) y caché larga para `/assets/*` del build (nombres con hash); `index.html` sin caché.
6. **Contraseñas de ejemplo**: script `backend/scripts/verificar-claves.js` que revisa si algún usuario **activo** todavía tiene una contraseña del seed (`Admin123*`, `Tecnico123*`, `Operario123*`) o cualquier contraseña de menos de 8 caracteres no es verificable (solo se comprueban las del seed). Sale con código 1 y lista los usuarios afectados. Lo usará el lanzador de publicación para negarse a publicar.
7. **Política de contraseñas** al crear o cambiar: mínimo 8 caracteres, con letras y números (backend y frontend).
8. `PUT /consolas/:id/reparacion`: si no se envía `diagnostico_resultado`, conservar el valor actual (hoy lo borra).
9. Errores en producción: nunca stack traces (ya cumplido); registrar en consola con fecha.

## Lanzadores (los hace el orquestador)
- `iniciar.bat` → modo producción: enciende MySQL, compila el frontend (`npm run build`), arranca el servidor único en 0.0.0.0:5173 y abre el navegador.
- `iniciar-desarrollo.bat` → el modo actual (Vite + API) para trabajar en el código.
- `publicar.bat` → comprueba que la app está encendida y que no quedan contraseñas de ejemplo, inicia `cloudflared tunnel --url http://localhost:5173` y muestra la dirección pública `https://….trycloudflare.com`. Al cerrar la ventana, la app deja de estar en internet (sigue en la red local).

## Fuera de alcance (futuro homelab)
Túnel con nombre y dominio propio, servicio de Windows/Docker, Cloudflare Access para proteger `/panel`, copias automáticas.
