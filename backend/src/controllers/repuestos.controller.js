const { pool, enTransaccion } = require('../config/db');
const { noEncontrado, solicitudInvalida } = require('../utils/HttpError');
const {
  ESTADOS_REPUESTO, MAX_INT, textoObligatorio, textoOpcional, enumValido, enteroPositivo, montoOpcional, idParam,
  estaVacio,
} = require('../utils/validacion');
const { listarRepuestos } = require('../services/consolas.service');

function cantidadValida(valor) {
  const n = enteroPositivo(valor, 'cantidad');
  if (n > MAX_INT) throw solicitudInvalida('El campo "cantidad" es demasiado grande');
  return n;
}

const VALIDADORES = {
  nombre: (v) => textoObligatorio(v, 'nombre', 150),
  cantidad: cantidadValida,
  costo_estimado: (v) => montoOpcional(v, 'costo_estimado'),
  estado: (v) => enumValido(v, ESTADOS_REPUESTO, 'estado'),
  notas: (v) => textoOpcional(v, 'notas', 5000),
};

/**
 * Valida un repuesto. Con `parcial` solo se validan los campos enviados (edición);
 * si no, nombre y cantidad son obligatorios y el resto toma su valor por defecto.
 */
function datosRepuesto(b = {}, { parcial = false } = {}) {
  const datos = {};
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    if (b[campo] !== undefined) datos[campo] = validar(b[campo]);
  }
  if (!parcial) {
    datos.nombre = VALIDADORES.nombre(b.nombre);
    datos.cantidad = cantidadValida(b.cantidad);
    datos.costo_estimado = datos.costo_estimado ?? null;
    datos.estado = estaVacio(b.estado) ? 'pendiente' : datos.estado;
    datos.notas = datos.notas ?? null;
  }
  return datos;
}

async function obtenerRepuesto(consolaId, repuestoId) {
  const [filas] = await pool.query(
    `SELECT r.*, u.nombre AS registrado_por_nombre
       FROM repuestos_consola r LEFT JOIN usuarios u ON u.id = r.registrado_por
      WHERE r.id = ? AND r.consola_id = ?`,
    [repuestoId, consolaId],
  );
  return filas[0] || null;
}

async function existeConsola(cx, id, bloquear = false) {
  const [filas] = await cx.query(`SELECT id FROM consolas WHERE id = ?${bloquear ? ' FOR UPDATE' : ''}`, [id]);
  if (!filas.length) throw noEncontrado('Consola no encontrada');
}

async function listar(req, res) {
  const consolaId = idParam(req.params.id);
  await existeConsola(pool, consolaId);
  res.json(await listarRepuestos(consolaId));
}

async function crear(req, res) {
  const consolaId = idParam(req.params.id);
  const d = datosRepuesto(req.body);
  const id = await enTransaccion(async (cx) => {
    await existeConsola(cx, consolaId, true);
    const [r] = await cx.query(
      `INSERT INTO repuestos_consola (consola_id, nombre, cantidad, costo_estimado, estado, notas, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [consolaId, d.nombre, d.cantidad, d.costo_estimado, d.estado, d.notas, req.usuario.id],
    );
    // Registrar un repuesto implica que la consola los necesita.
    await cx.query('UPDATE consolas SET necesita_repuestos = 1 WHERE id = ?', [consolaId]);
    return r.insertId;
  });
  res.status(201).json(await obtenerRepuesto(consolaId, id));
}

async function actualizar(req, res) {
  const consolaId = idParam(req.params.id);
  const repuestoId = idParam(req.params.rid, 'rid');
  const d = datosRepuesto(req.body, { parcial: true });
  if (!(await obtenerRepuesto(consolaId, repuestoId))) throw noEncontrado('Repuesto no encontrado');
  const columnas = Object.keys(d); // nombres fijos de VALIDADORES
  if (columnas.length) {
    await pool.query(
      `UPDATE repuestos_consola SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND consola_id = ?`,
      [...columnas.map((c) => d[c]), repuestoId, consolaId],
    );
  }
  res.json(await obtenerRepuesto(consolaId, repuestoId));
}

async function eliminar(req, res) {
  const consolaId = idParam(req.params.id);
  const repuestoId = idParam(req.params.rid, 'rid');
  const [r] = await pool.query('DELETE FROM repuestos_consola WHERE id = ? AND consola_id = ?', [repuestoId, consolaId]);
  if (!r.affectedRows) throw noEncontrado('Repuesto no encontrado');
  res.json({ mensaje: 'Repuesto eliminado' });
}

module.exports = {
  listar, crear, actualizar, eliminar, datosRepuesto,
};
