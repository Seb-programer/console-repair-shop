const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { noEncontrado, solicitudInvalida } = require('../utils/HttpError');
const {
  ROLES, textoObligatorio, enumValido, validarPassword, booleano, idParam, estaVacio,
} = require('../utils/validacion');

const CAMPOS = 'id, nombre, usuario, rol, activo, creado_en, actualizado_en';
const RONDAS_BCRYPT = 10;

async function obtenerPorId(id) {
  const [filas] = await pool.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = ?`, [id]);
  return filas[0] || null;
}

function validarNombreUsuario(valor) {
  const usuario = textoObligatorio(valor, 'usuario', 50);
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(usuario)) {
    throw solicitudInvalida('El usuario debe tener entre 3 y 50 caracteres (letras, números, punto, guion o guion bajo)');
  }
  return usuario;
}

async function listar(req, res) {
  const [filas] = await pool.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY nombre`);
  res.json(filas);
}

async function crear(req, res) {
  const b = req.body || {};
  const nombre = textoObligatorio(b.nombre, 'nombre', 100);
  const usuario = validarNombreUsuario(b.usuario);
  const password = validarPassword(b.password);
  const rol = enumValido(b.rol, ROLES, 'rol');

  const hash = await bcrypt.hash(password, RONDAS_BCRYPT);
  const [r] = await pool.query(
    'INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, usuario, hash, rol],
  );
  res.status(201).json(await obtenerPorId(r.insertId));
}

async function actualizar(req, res) {
  const id = idParam(req.params.id);
  const b = req.body || {};
  const actual = await obtenerPorId(id);
  if (!actual) throw noEncontrado('Usuario no encontrado');

  const sets = [];
  const params = [];
  const agregar = (columna, valor) => { sets.push(`${columna} = ?`); params.push(valor); };

  if (b.nombre !== undefined) agregar('nombre', textoObligatorio(b.nombre, 'nombre', 100));
  if (b.usuario !== undefined) agregar('usuario', validarNombreUsuario(b.usuario));
  if (b.rol !== undefined) {
    const rol = enumValido(b.rol, ROLES, 'rol');
    if (id === req.usuario.id && rol !== 'administrador') {
      throw solicitudInvalida('No puede quitarse a sí mismo el rol de administrador');
    }
    agregar('rol', rol);
  }
  if (b.activo !== undefined) {
    const activo = booleano(b.activo, 'activo');
    if (id === req.usuario.id && !activo) throw solicitudInvalida('No puede desactivarse a sí mismo');
    agregar('activo', activo ? 1 : 0);
  }
  if (!estaVacio(b.password)) agregar('password_hash', await bcrypt.hash(validarPassword(b.password), RONDAS_BCRYPT));

  if (!sets.length) throw solicitudInvalida('No se enviaron campos para actualizar');
  await pool.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  res.json(await obtenerPorId(id));
}

async function desactivar(req, res) {
  const id = idParam(req.params.id);
  if (id === req.usuario.id) throw solicitudInvalida('No puede desactivarse a sí mismo');
  const [r] = await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('Usuario no encontrado');
  res.json({ mensaje: 'Usuario desactivado' });
}

module.exports = { listar, crear, actualizar, desactivar };
