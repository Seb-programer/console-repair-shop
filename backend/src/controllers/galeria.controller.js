const { pool } = require('../config/db');
const { noEncontrado, solicitudInvalida } = require('../utils/HttpError');
const {
  textoOpcional, enteroNoNegativo, booleano, idParam, estaVacio, MAX_INT,
} = require('../utils/validacion');
const { rutaPublica, borrarPorRutaPublica } = require('../utils/archivos');

function ordenValido(valor) {
  const n = enteroNoNegativo(valor, 'orden');
  if (n > MAX_INT) throw solicitudInvalida('El campo "orden" es demasiado grande');
  return n;
}

/**
 * Valida titulo, descripcion, orden y visible. Solo se incluyen los campos
 * enviados (en POST los ausentes toman su valor por defecto; en PUT se conservan).
 */
function datosGaleria(b = {}) {
  const datos = {};
  if (b.titulo !== undefined) datos.titulo = textoOpcional(b.titulo, 'titulo', 150);
  if (b.descripcion !== undefined) datos.descripcion = textoOpcional(b.descripcion, 'descripcion', 5000);
  if (!estaVacio(b.orden)) datos.orden = ordenValido(b.orden);
  if (!estaVacio(b.visible)) datos.visible = booleano(b.visible, 'visible') ? 1 : 0;
  return datos;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query(
    `SELECT g.*, u.nombre AS subido_por_nombre
       FROM galeria g LEFT JOIN usuarios u ON u.id = g.subido_por
      WHERE g.id = ?`,
    [id],
  );
  return filas[0] || null;
}

async function listar(req, res) {
  const [filas] = await pool.query(
    `SELECT g.*, u.nombre AS subido_por_nombre
       FROM galeria g LEFT JOIN usuarios u ON u.id = g.subido_por
      ORDER BY g.orden, g.creado_en DESC, g.id DESC`,
  );
  res.json(filas);
}

async function crear(req, res) {
  if (!req.file) throw solicitudInvalida('Debe adjuntar un archivo (imagen o video) en el campo "archivo"');
  const d = datosGaleria(req.body);
  const [r] = await pool.query(
    'INSERT INTO galeria (tipo, ruta, titulo, descripcion, orden, visible, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.file.tipoGaleria, rutaPublica(req.file), d.titulo ?? null, d.descripcion ?? null, d.orden ?? 0,
      d.visible ?? 1, req.usuario.id],
  );
  res.status(201).json(await obtenerPorId(r.insertId));
}

async function actualizar(req, res) {
  const id = idParam(req.params.id);
  const d = datosGaleria(req.body);
  const columnas = Object.keys(d); // nombres fijos de datosGaleria
  if (columnas.length) {
    const [r] = await pool.query(
      `UPDATE galeria SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...columnas.map((c) => d[c]), id],
    );
    if (!r.affectedRows) throw noEncontrado('Elemento de galería no encontrado');
  }
  const elemento = await obtenerPorId(id);
  if (!elemento) throw noEncontrado('Elemento de galería no encontrado');
  res.json(elemento);
}

async function eliminar(req, res) {
  const id = idParam(req.params.id);
  const elemento = await obtenerPorId(id);
  if (!elemento) throw noEncontrado('Elemento de galería no encontrado');
  await pool.query('DELETE FROM galeria WHERE id = ?', [id]);
  await borrarPorRutaPublica(elemento.ruta);
  res.json({ mensaje: 'Elemento eliminado' });
}

module.exports = {
  listar, crear, actualizar, eliminar, datosGaleria,
};
