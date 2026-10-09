const net = require('net');

/** Quita el prefijo IPv4-mapeado de IPv6 ("::ffff:192.168.1.5" → "192.168.1.5"). */
function normalizarIp(ip) {
  if (!ip) return '';
  const texto = String(ip).trim();
  return texto.toLowerCase().startsWith('::ffff:') && net.isIPv4(texto.slice(7)) ? texto.slice(7) : texto;
}

function esLoopback(ip) {
  const n = normalizarIp(ip);
  return n === '::1' || (net.isIPv4(n) && n.startsWith('127.'));
}

/** ¿Express está configurado para confiar en este par como proxy? ('trust proxy'). */
function confiaEnProxy(req, par) {
  const confiar = req.app && typeof req.app.get === 'function' ? req.app.get('trust proxy fn') : null;
  return typeof confiar === 'function' ? Boolean(confiar(par, 0)) : false;
}

/**
 * IP real del cliente para los límites de intentos.
 * - Si la conexión llega desde el propio PC (loopback: cloudflared) y Express confía en el
 *   proxy local ('trust proxy' = 'loopback', modo producción), se usa `CF-Connecting-IP`
 *   (la añade Cloudflare) y, si no está, `req.ip` (X-Forwarded-For resuelto por Express).
 * - En cualquier otro caso (p. ej. un equipo de la red local conectado directamente) se usa
 *   la IP de la conexión y se ignoran las cabeceras, que el cliente podría falsear.
 */
function ipCliente(req) {
  const par = normalizarIp(req.socket?.remoteAddress);
  if (!par) return normalizarIp(req.ip) || 'desconocida';
  if (esLoopback(par) && confiaEnProxy(req, par)) {
    const cf = normalizarIp(req.headers?.['cf-connecting-ip']);
    if (cf && net.isIP(cf)) return cf;
    return normalizarIp(req.ip) || par;
  }
  return par;
}

module.exports = { ipCliente, esLoopback, normalizarIp };
