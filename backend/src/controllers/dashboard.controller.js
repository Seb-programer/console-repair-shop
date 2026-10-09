const { pool } = require('../config/db');
const { ESTADOS_CONSOLA } = require('../utils/validacion');

async function resumen(req, res) {
  const [conteos] = await pool.query('SELECT estado, COUNT(*) AS total FROM consolas GROUP BY estado');
  const porEstado = Object.fromEntries(ESTADOS_CONSOLA.map((e) => [e, 0]));
  conteos.forEach((c) => { porEstado[c.estado] = Number(c.total); });

  const [ultimas] = await pool.query(
    `SELECT co.id, co.marca, co.modelo, co.estado, co.fecha_ingreso, co.cliente_id, cl.nombre AS cliente_nombre,
            t.nombre AS tecnico_nombre
       FROM consolas co
       JOIN clientes cl ON cl.id = co.cliente_id
       LEFT JOIN usuarios t ON t.id = co.tecnico_id
      ORDER BY co.fecha_ingreso DESC, co.id DESC
      LIMIT 5`,
  );

  // Rango en lugar de DATE(fecha) para que se use el índice idx_ventas_fecha.
  const [[ventas]] = await pool.query(
    `SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
       FROM ventas
      WHERE fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY`,
  );

  res.json({
    consolas_por_estado: porEstado,
    total_consolas: Object.values(porEstado).reduce((a, b) => a + b, 0),
    ultimas_consolas: ultimas,
    ventas_hoy: { cantidad: Number(ventas.cantidad), total: Number(ventas.total) },
  });
}

module.exports = { resumen };
