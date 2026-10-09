const { pool } = require('../config/db');
const { noEncontrado } = require('../utils/HttpError');
const {
  textoObligatorio, textoOpcional, precioValido, enteroNoNegativo, booleano, idParam,
} = require('../utils/validacion');
const { rutaPublica, borrarPorRutaPublica } = require('../utils/archivos');

const LIMITE_LISTADO = 500;

/** Valida el cuerpo (JSON o multipart) de un artículo. */
function datosArticulo(b = {}) {
  const datos = {
    nombre: textoObligatorio(b.nombre, 'nombre', 150),
    descripcion: textoOpcional(b.descripcion, 'descripcion', 5000),
    categoria: textoOpcional(b.categoria, 'categoria', 60),
    precio: precioValido(b.precio, 'precio'),
    stock: enteroNoNegativo(b.stock, 'stock'),
  };
  if (b.activo !== undefined && b.activo !== '') datos.activo = booleano(b.activo, 'activo') ? 1 : 0;
  return datos;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query('SELECT * FROM articulos WHERE id = ?', [id]);
  return filas[0] || null;
}

async function listar(req, res) {
  const condiciones = [];
  const params = [];
  const verTodos = req.query.todos === '1' && req.usuario.rol === 'administrador';
  if (!verTodos) condiciones.push('activo = 1');
  const q = textoOpcional(req.query.q, 'q', 100);
  if (q) {
    condiciones.push('(nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ?)');
    const patron = `%${q}%`;
    params.push(patron, patron, patron);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT * FROM articulos ${where} ORDER BY nombre LIMIT ?`,
    [...params, LIMITE_LISTADO],
  );
  res.json(filas);
}

async function detalle(req, res) {
  const articulo = await obtenerPorId(idParam(req.params.id));
  if (!articulo || (!articulo.activo && req.usuario.rol !== 'administrador')) throw noEncontrado('Artículo no encontrado');
  res.json(articulo);
}

async function crear(req, res) {
  const d = datosArticulo(req.body);
  const foto = req.file ? rutaPublica(req.file) : null;
  const [r] = await pool.query(
    'INSERT INTO articulos (nombre, descripcion, categoria, precio, stock, foto, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [d.nombre, d.descripcion, d.categoria, d.precio, d.stock, foto, d.activo ?? 1],
  );
  res.status(201).json(await obtenerPorId(r.insertId));
}

async function actualizar(req, res) {
  const id = idParam(req.params.id);
  const actual = await obtenerPorId(id);
  if (!actual) throw noEncontrado('Artículo no encontrado');
  const d = datosArticulo(req.body);

  const quitarFoto = req.body?.quitar_foto === '1' || req.body?.quitar_foto === 'true' || req.body?.quitar_foto === true;
  let foto = actual.foto;
  if (req.file) foto = rutaPublica(req.file);
  else if (quitarFoto) foto = null;

  await pool.query(
    `UPDATE articulos SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, stock = ?, foto = ?, activo = ?
      WHERE id = ?`,
    [d.nombre, d.descripcion, d.categoria, d.precio, d.stock, foto, d.activo ?? actual.activo, id],
  );
  if (actual.foto && actual.foto !== foto) await borrarPorRutaPublica(actual.foto);
  res.json(await obtenerPorId(id));
}

async function desactivar(req, res) {
  const id = idParam(req.params.id);
  const [r] = await pool.query('UPDATE articulos SET activo = 0 WHERE id = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('Artículo no encontrado');
  res.json({ mensaje: 'Artículo desactivado' });
}

module.exports = {
  listar, detalle, crear, actualizar, desactivar, datosArticulo,
};
