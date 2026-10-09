const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', '..');

// dotenv NO sobrescribe variables ya definidas en el entorno: DB_NAME, PORT, HOST, UPLOADS_DIR…
// pasadas al proceso tienen prioridad sobre backend/.env (p. ej. para una instancia de demo).
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env'), quiet: true });

/** Ruta absoluta de la carpeta de subidas (las relativas se resuelven desde backend/, no desde el cwd). */
function resolverUploadsDir(valor) {
  return path.resolve(BACKEND_DIR, (valor || '').trim() || 'uploads');
}

const produccion = process.env.SERVIR_FRONTEND === '1' || process.env.NODE_ENV === 'production';

const config = {
  // Modo producción: el mismo servidor sirve el frontend compilado (frontend/dist) y endurece las cabeceras.
  produccion,
  frontendDist: process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', '..', 'frontend', 'dist'),
  port: Number(process.env.PORT) || 3001,
  // Desarrollo: solo dentro del propio PC; producción: el lanzador pasa HOST=0.0.0.0.
  host: process.env.HOST || '127.0.0.1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Valor de 'trust proxy' de Express. En producción, por defecto 'loopback' (cloudflared corre
  // en el mismo PC); en desarrollo, vacío (no se confía en cabeceras X-Forwarded-*).
  trustProxy: process.env.TRUST_PROXY || (produccion ? 'loopback' : ''),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'consolas_db',
  },
  // Carpeta de archivos subidos: UPLOADS_DIR (absoluta o relativa a backend/); por defecto backend/uploads.
  uploadsDir: resolverUploadsDir(process.env.UPLOADS_DIR),
};

module.exports = config;
module.exports.resolverUploadsDir = resolverUploadsDir;
