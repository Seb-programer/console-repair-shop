const app = require('./app');
const config = require('./config/env');
const { pool } = require('./config/db');

// Desarrollo: solo escucha dentro del propio PC; los demás equipos entran por el proxy de Vite.
// Producción: el lanzador pasa HOST=0.0.0.0 y PORT=5173 (red local + cloudflared).
const { host } = config;
const servidor = app.listen(config.port, host, () => {
  const modo = config.produccion ? 'producción (API + web compilada)' : 'desarrollo (solo API)';
  console.log(`[${new Date().toISOString()}] Servidor en modo ${modo} escuchando en http://${host}:${config.port}`);
  console.log(`Base de datos: ${config.db.database} · Archivos subidos: ${config.uploadsDir}`);
});
servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${config.port} ya está en uso: ¿la app ya está encendida en otra ventana?`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

function cerrar() {
  servidor.close(() => pool.end().finally(() => process.exit(0)));
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
