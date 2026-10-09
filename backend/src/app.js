const express = require('express');
const cors = require('cors');
const compression = require('compression');
const config = require('./config/env');
const rutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middleware/errores');
const { cabecerasProduccion, cabecerasDesarrollo } = require('./middleware/seguridad');
const { servirFrontend } = require('./middleware/frontend');

if (!config.jwtSecret) {
  throw new Error('Falta la variable de entorno JWT_SECRET (copie .env.example a .env)');
}

/**
 * Crea la app de Express.
 * - Desarrollo (por defecto): solo /api y /uploads; Vite sirve la web y hace de proxy.
 * - Producción (`produccion: true`, con SERVIR_FRONTEND=1 o NODE_ENV=production): además sirve
 *   frontend/dist con fallback a index.html, comprime y añade cabeceras de seguridad con CSP.
 */
function crearApp({
  produccion = config.produccion,
  frontendDist = config.frontendDist,
  trustProxy = config.trustProxy,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  // 'trust proxy': vacío en desarrollo (el proxy de Vite no añade X-Forwarded-For y un cliente
  // podría falsearlo); 'loopback' en producción: solo se cree a cloudflared, que corre en el mismo PC.
  // La IP para los límites de intentos se obtiene con utils/ipCliente.
  if (trustProxy) app.set('trust proxy', trustProxy);

  app.use(produccion ? cabecerasProduccion() : cabecerasDesarrollo);
  if (produccion) app.use(compression());
  app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadsDir, {
    index: false,
    dotfiles: 'ignore',
    // Evita que el navegador "adivine" otro tipo (p. ej. HTML) en un archivo subido.
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));
  app.use('/api', rutas);
  if (produccion) app.use(servirFrontend(frontendDist));
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}

const app = crearApp();

module.exports = app;
module.exports.crearApp = crearApp;
