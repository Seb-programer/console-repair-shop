const { pool } = require('../config/db');
const { noEncontrado } = require('../utils/HttpError');
const {
  textoObligatorio, textoOpcional, emailOpcional, idParam, normalizarDocumento,
} = require('../utils/validacion');

const LIMITE_LISTADO = 200;

/** Valida el cuerpo de creación/edición de un cliente. */
function datosCliente(b = {}) {
  return {
    nombre: textoObligatorio(b.nombre, 'nombre', 150),
    // Se guarda sin espacios, puntos ni guiones para que la consulta pública lo encuentre.
    documento: normalizarDocumento(textoOpcional(b.documento, 'documento', 30)),
    telefono: textoOpcional(b.telefono, 'telefono', 30),
    email: emailOpcional(b.email),
    direccion: textoOpcional(b.direccion, 'direccion', 255),
  };
}

async function obtenerPorId(id) {
  const [filas] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return filas[0] || null;
}

async function listar(req, res) {
  const q = textoOpcional(req.query.q, 'q', 100);
  let sql = 'SELECT * FROM clientes';
  const params = [];
  if (q) {
    sql += ' WHERE nombre LIKE ? OR documento LIKE ? OR telefono LIKE ?';
    const patron = `%${q}%`;
    params.push(patron, patron, patron);
  }
  sql += ' ORDER BY nombre LIMIT ?';
  params.push(LIMITE_LISTADO);
  const [filas] = await pool.query(sql, params);
  res.json(filas);
}

async function detalle(req, res) {
  const id = idParam(req.params.id);
  const cliente = await obtenerPorId(id);
  if (!cliente) throw noEncontrado('Cliente no encontrado');
  const [consolas] = await pool.query(
    `SELECT co.id, co.marca, co.modelo, co.numero_serie, co.color, co.estado, co.falla_reportada,
            co.fecha_ingreso, co.fecha_finalizacion, co.tecnico_id, t.nombre AS tecnico_nombre
       FROM consolas co LEFT JOIN usuarios t ON t.id = co.tecnico_id
      WHERE co.cliente_id = ?
      ORDER BY co.fecha_ingreso DESC`,
    [id],
  );
  res.json({ ...cliente, consolas });
}

async function crear(req, res) {
  const d = datosCliente(req.body);
  const [r] = await pool.query(
    'INSERT INTO clientes (nombre, documento, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
    [d.nombre, d.documento, d.telefono, d.email, d.direccion],
  );
  res.status(201).json(await obtenerPorId(r.insertId));
}

async function actualizar(req, res) {
  const id = idParam(req.params.id);
  const d = datosCliente(req.body);
  const [r] = await pool.query(
    'UPDATE clientes SET nombre = ?, documento = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
    [d.nombre, d.documento, d.telefono, d.email, d.direccion, id],
  );
  if (!r.affectedRows) throw noEncontrado('Cliente no encontrado');
  res.json(await obtenerPorId(id));
}

module.exports = { listar, detalle, crear, actualizar, datosCliente };
