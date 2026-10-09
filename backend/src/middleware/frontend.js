const fs = require('fs');
const path = require('path');
const express = require('express');

const CACHE_ASSETS = 'public, max-age=31536000, immutable'; // nombres con hash: nunca cambian
const SIN_CACHE = 'no-cache'; // el navegador revalida siempre (ETag) → ve el build nuevo al instante

/** Rutas que nunca son de la web: la API y los archivos subidos (dan 404 JSON si no existen). */
function esRutaDeServidor(ruta) {
  return ruta === '/api' || ruta.startsWith('/api/') || ruta === '/uploads' || ruta.startsWith('/uploads/');
}

/**
 * Sirve el frontend compilado (frontend/dist):
 * - /assets/* con caché larga; index.html y el resto de archivos sueltos sin caché;
 * - cualquier otra ruta GET/HEAD que no sea /api ni /uploads → index.html (rutas de React).
 * Devuelve un array de middlewares para `app.use(...)`.
 */
function servirFrontend(distDir) {
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `[${new Date().toISOString()}] AVISO: no se encontró el frontend compilado en ${distDir}.\n`
      + '  Compílelo con: cd frontend && npm run build   (la API seguirá funcionando).',
    );
  }

  const estaticos = express.static(distDir, {
    index: false,
    dotfiles: 'ignore',
    fallthrough: true,
    setHeaders(res, archivo) {
      const relativo = path.relative(distDir, archivo).split(path.sep).join('/');
      res.setHeader('Cache-Control', relativo.startsWith('assets/') ? CACHE_ASSETS : SIN_CACHE);
    },
  });

  function filtroEstaticos(req, res, next) {
    if (esRutaDeServidor(req.path)) return next();
    return estaticos(req, res, next);
  }

  function fallbackSpa(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    // Un archivo del build que no existe (p. ej. un /assets/ antiguo) no debe recibir el HTML.
    if (esRutaDeServidor(req.path) || req.path.startsWith('/assets/')) return next();
    res.setHeader('Cache-Control', SIN_CACHE);
    return res.sendFile(indexHtml, (err) => {
      if (!err) return;
      if (res.headersSent) return;
      if (err.code === 'ENOENT') {
        res.status(503).type('text/plain; charset=utf-8')
          .send('La web no está compilada. Ejecute "npm run build" en la carpeta frontend y recargue la página.');
        return;
      }
      next(err);
    });
  }

  return [filtroEstaticos, fallbackSpa];
}

module.exports = { servirFrontend, esRutaDeServidor, CACHE_ASSETS, SIN_CACHE };
