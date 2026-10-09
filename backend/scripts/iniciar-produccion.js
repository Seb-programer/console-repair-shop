// Arranca el servidor unico en modo produccion (API + web compilada) con valores por defecto
// equivalentes a produccion.cmd. Las variables ya definidas en el entorno tienen prioridad.
// Uso: npm run start:prod   (antes: cd ../frontend && npm run build)
const valores = {
  SERVIR_FRONTEND: '1',
  NODE_ENV: 'production',
  PORT: '5173',
  HOST: '0.0.0.0',
};
for (const [clave, valor] of Object.entries(valores)) {
  if (!process.env[clave]) process.env[clave] = valor;
}
require('../src/server');
