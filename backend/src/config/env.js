const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const produccion = process.env.SERVIR_FRONTEND === '1' || process.env.NODE_ENV === 'production';

const config = {
  // Modo producción: el mismo servidor sirve el frontend compilado (frontend/dist) y endurece las cabeceras.
  produccion,
  frontendDist: process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', '..', 'frontend', 'dist'),
  port: Number(process.env.PORT) || 3001,
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
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
};

module.exports = config;
