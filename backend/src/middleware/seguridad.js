const helmet = require('helmet');
const { esLoopback, normalizarIp } = require('../utils/ipCliente');

/**
 * Content-Security-Policy de la app compilada (frontend/dist):
 * - scripts y estilos propios (el build no tiene <script>/<style> en línea; los style={{}}
 *   de React se aplican por el DOM y no necesitan 'unsafe-inline');
 * - Google Fonts: la hoja de fonts.googleapis.com (@import en index.css) y las fuentes de fonts.gstatic.com;
 * - imágenes propias (/uploads), data: (SVG en el CSS) y blob: (vistas previas antes de subir);
 * - videos propios y blob: (vista previa de videos de la galería);
 * - la API es del mismo origen (connect-src 'self').
 * Los enlaces externos (wa.me, Google Maps, redes, tel:, mailto:) son navegación y la CSP no los limita.
 * Sin upgrade-insecure-requests: la red local entra por http://<IP>:5173.
 */
const DIRECTIVAS_CSP = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
};

const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';
const HSTS = 'max-age=15552000'; // 180 días

/**
 * ¿La petición llegó por HTTPS? Directamente (req.secure) o a través de cloudflared
 * (loopback) con X-Forwarded-Proto: https. Un equipo de la red local no puede forzarlo.
 */
function llegoPorHttps(req) {
  if (req.secure) return true;
  const par = normalizarIp(req.socket?.remoteAddress);
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return esLoopback(par) && proto === 'https';
}

/**
 * Cabeceras de seguridad del modo producción (helmet + Permissions-Policy + HSTS condicional).
 * Cross-Origin-Opener-Policy y Origin-Agent-Cluster solo se envían por HTTPS: en un origen
 * HTTP que no es localhost (la red local, http://<IP>:5173) el navegador los ignora y escribe
 * un error/aviso en la consola en cada página.
 */
function cabecerasProduccion() {
  const opciones = {
    contentSecurityPolicy: { useDefaults: false, directives: DIRECTIVAS_CSP },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: false, // se pone abajo solo si la petición llegó por HTTPS
    crossOriginEmbedderPolicy: false,
  };
  const porHttps = helmet(opciones);
  const porHttp = helmet({ ...opciones, crossOriginOpenerPolicy: false, originAgentCluster: false });
  return function seguridad(req, res, next) {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    if (llegoPorHttps(req)) {
      res.setHeader('Strict-Transport-Security', HSTS);
      return porHttps(req, res, next);
    }
    return porHttp(req, res, next);
  };
}

/**
 * Cabeceras básicas en desarrollo: sin CSP (Vite usa scripts en línea para la recarga en caliente).
 * El backend en desarrollo solo responde /api y /uploads a través del proxy de Vite.
 */
function cabecerasDesarrollo(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

module.exports = {
  cabecerasProduccion, cabecerasDesarrollo, llegoPorHttps, DIRECTIVAS_CSP, PERMISSIONS_POLICY,
};
