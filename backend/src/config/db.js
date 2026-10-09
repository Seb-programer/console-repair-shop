const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  decimalNumbers: true,
  dateStrings: false,
  timezone: 'local',
});

// El servidor (XAMPP) no usa modo estricto: un ENUM inválido se guardaría como ''
// y un texto largo se truncaría en silencio. Se activa por sesión en cada conexión
// nueva del pool (la consulta queda en cola antes que cualquier otra).
const SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
pool.pool.on('connection', (conexion) => {
  conexion.query(`SET SESSION sql_mode = '${SQL_MODE}'`);
});

/**
 * Ejecuta `fn(conexion)` dentro de una transacción.
 * Hace commit si termina bien y rollback si lanza un error.
 */
async function enTransaccion(fn) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await fn(conexion);
    await conexion.commit();
    return resultado;
  } catch (err) {
    await conexion.rollback().catch(() => {});
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { pool, enTransaccion };
