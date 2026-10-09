const { pool } = require('../config/db');
const { noEncontrado } = require('../utils/HttpError');
const { enteroPositivo, idParam, estaVacio } = require('../utils/validacion');
const servicio = require('../services/ventas.service');

const LIMITE_LISTADO = 500;

async function listar(req, res) {
  const [filas] = await pool.query(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre, v.usuario_id, u.nombre AS usuario_nombre,
            v.total, v.fecha,
            (SELECT COALESCE(SUM(d.cantidad), 0) FROM detalle_venta d WHERE d.venta_id = v.id) AS cantidad_articulos
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       JOIN usuarios u ON u.id = v.usuario_id
      ORDER BY v.fecha DESC, v.id DESC
      LIMIT ?`,
    [LIMITE_LISTADO],
  );
  res.json(filas);
}

async function detalle(req, res) {
  const venta = await servicio.obtenerVenta(idParam(req.params.id));
  if (!venta) throw noEncontrado('Venta no encontrada');
  res.json(venta);
}

async function crear(req, res) {
  const b = req.body || {};
  const clienteId = estaVacio(b.cliente_id) ? null : enteroPositivo(b.cliente_id, 'cliente_id');
  const id = await servicio.crearVenta({ clienteId, items: b.items, usuarioId: req.usuario.id });
  res.status(201).json(await servicio.obtenerVenta(id));
}

module.exports = { listar, detalle, crear };
