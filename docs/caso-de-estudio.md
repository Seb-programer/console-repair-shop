# Caso de estudio: Gestión de Taller de Consolas

**[Read in English](case-study.md)**

## El problema
Un emprendimiento repara, mantiene y vende consolas de videojuegos. Antes de este proyecto lo registraba todo en papel y en conversaciones de WhatsApp, y eso causaba cuatro problemas:
- **Información perdida:** los equipos llegaban sin un registro claro de su estado ni de sus accesorios.
- **Preguntas repetidas:** los clientes escribían una y otra vez "¿ya está mi consola?".
- **Sin visibilidad para el equipo:** nadie tenía una vista compartida de la carga de trabajo, es decir, cuántas consolas estaban en espera, en proceso o finalizadas.
- **Sin presencia en internet:** no había dónde mostrar los trabajos realizados ni los productos a la venta.

## Objetivos
1. Registrar cada consola en la recepción con los datos del cliente y fotos, como evidencia del estado en que llega.
2. Que el técnico documente cada procedimiento con fotos, el resultado de la reparación y los repuestos necesarios.
3. Que el cliente consulte el estado por su cuenta sin exponer datos personales.
4. Que cada rol del personal tenga solo los permisos que necesita.
5. Funcionar en el PC que el negocio ya tenía, casi sin costo, con camino a un homelab o a la nube.

## Proceso
Lo construí dirigiendo un equipo de agentes de IA con Claude Code, con un rol por agente: orquestador, base de datos, backend, frontend y QA. Cada fase siguió el mismo ciclo:

1. **Requisitos:** preguntas sobre las decisiones que solo podía tomar el dueño del negocio. Por ejemplo, cómo se identifica el cliente, si los videos se suben o se enlazan, y qué incluye el reporte del técnico.
2. **Especificación:** un contrato escrito en `docs/ESPECIFICACION*.md` con la matriz de permisos, el modelo de datos, cada endpoint con su entrada y su salida, y las pantallas.
3. **Construcción en paralelo:** los agentes de base de datos, backend y frontend trabajaron a la vez contra ese contrato. Entre ellos se pasaban avisos, por ejemplo "el servidor no está en modo SQL estricto: valida los ENUM con lista blanca" o "el borrado en cascada no elimina los archivos".
4. **Verificación:** después de cada entrega, el orquestador volvía a ejecutar las pruebas y revisaba los datos. Luego QA revisaba el código, probaba los flujos completos de cada rol y comprobaba la app en un navegador real, en escritorio y en móvil.

| Fase | Alcance |
|---|---|
| 1 | App interna: clientes, recepción con fotos, procedimientos, estados, catálogo, ventas, usuarios con roles |
| 2 | Página pública, galería de fotos y videos, consulta por documento, reporte de reparación, repuestos, notas internas |
| 3 | Modo producción, endurecimiento de seguridad, publicación con Cloudflare Tunnel, copias de seguridad, CI |

## Decisiones de arquitectura

| Decisión | Motivo |
|---|---|
| **Express + React + MySQL** | Es un stack muy conocido y barato de alojar. El negocio ya tenía un PC con Windows, y XAMPP aporta MySQL y phpMyAdmin para revisar los datos. |
| **Un solo servidor en producción** | Express sirve la API, los archivos y la app de React compilada en un mismo puerto. Así hay un solo proceso, una sola regla de firewall y un único origen, sin necesidad de CORS. |
| **Archivos en disco y rutas en la base de datos** | Es simple y suficiente para este tamaño. El backend borra los archivos cuando se borra el registro, porque la cascada de la base de datos solo elimina filas. |
| **Migraciones en lugar de recrear el esquema** | La fase 2 modificó una base de datos que ya tenía datos reales. La migración es idempotente, se ensayó antes en una copia de prueba y se aplicó después de hacer un respaldo. Una huella MD5 confirmó que los datos existentes no cambiaron. |
| **Consulta pública por documento** | La eligió el dueño porque es fácil para el cliente. Se protege con una lista blanca de campos, mostrando solo el primer nombre y los últimos 4 caracteres de la serie, con la misma respuesta 404 exista o no el documento, y con un límite de intentos. |
| **Cloudflare Tunnel** | Permite publicar desde el PC de la casa sin abrir puertos del router y con HTTPS incluido. Una dirección temporal sirve para probar; para el futuro homelab está previsto un túnel con nombre y dominio propio. |

## Seguridad
- **Autorización:** se comprueba en cada ruta según la matriz de permisos. QA la auditó ruta por ruta.
- **IP real del cliente detrás del túnel:** `CF-Connecting-IP` solo se acepta cuando la conexión viene de loopback, que es donde corre cloudflared. Las pruebas demuestran que un equipo de la red local no puede saltarse los límites falsificando cabeceras.
- **Validación de archivos subidos:** se revisa la firma real del archivo (JPEG, PNG, WebP, MP4, WebM). QA descubrió que la primera versión se fiaba del tipo declarado y lo corrigió.
- **Cabeceras de producción:** una CSP estricta sin `unsafe-inline`, probada en un navegador real con cero violaciones. COOP y HSTS solo se envían por HTTPS.
- **Inicio de sesión:** los errores son genéricos, así que no revelan si un usuario está inactivo. Hay límite de intentos por IP y por usuario, y una política mínima de contraseñas.
- **Publicación segura:** el script de publicación se niega a poner la app en internet si queda alguna contraseña de ejemplo o si está en modo desarrollo.

## Calidad
- **117 pruebas automáticas:** unitarias y de integración contra una base de datos MariaDB real. Cubren las reglas de privacidad, los límites de intentos, los permisos por rol, la validación de archivos, las transacciones (por ejemplo, el bloqueo de stock con `SELECT … FOR UPDATE`) y el manejo de UTF-8 de principio a fin.
- **Pruebas en navegador con Playwright:** diseño en escritorio y en móvil, sin scroll horizontal, sin errores en la consola y sin violaciones de CSP.
- **CI:** GitHub Actions ejecuta las pruebas del backend contra un servicio de MariaDB, además del lint y el build del frontend.

## Resultados
- La recepción, el seguimiento de reparaciones y las ventas están en un solo sistema, con evidencia fotográfica en cada paso.
- Los clientes consultan el estado de su consola por su cuenta, desde cualquier celular.
- La app funciona en la red local del taller y se puede publicar en internet con un clic, después de una verificación de seguridad.
- Hacer una copia de seguridad o migrar a otro PC toma un clic cada uno, con `exportar.bat` e `instalar.bat`.

## Próximos pasos
- Un túnel con nombre y dominio propio, ejecutándose como servicio de Windows o en Docker dentro de un homelab.
- Copias de seguridad automáticas diarias guardadas fuera del PC.
- Comprobante de recepción imprimible con el número de orden, y notificaciones por WhatsApp cuando cambie el estado.
- Mover los archivos a un almacenamiento de objetos si la app se traslada a la nube.
