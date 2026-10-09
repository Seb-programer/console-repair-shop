const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../config/db');
const { noAutenticado, prohibido } = require('../utils/HttpError');

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

function extraerToken(req) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

/**
 * Verifica el JWT y carga el usuario desde la BD (así un usuario desactivado
 * o con rol cambiado pierde el acceso aunque su token siga vigente).
 */
async function autenticar(req, res, next) {
  const token = extraerToken(req);
  if (!token) return next(noAutenticado('Debe iniciar sesión'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(noAutenticado('Sesión inválida o expirada'));
  }

  const [filas] = await pool.query(
    'SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?',
    [payload.id],
  );
  const usuario = filas[0];
  if (!usuario || !usuario.activo) return next(noAutenticado('Usuario no válido o inactivo'));

  req.usuario = { id: usuario.id, nombre: usuario.nombre, usuario: usuario.usuario, rol: usuario.rol };
  return next();
}

/** Permite el acceso solo a los roles indicados. */
function autorizar(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return next(noAutenticado('Debe iniciar sesión'));
    if (!roles.includes(req.usuario.rol)) return next(prohibido());
    return next();
  };
}

module.exports = { autenticar, autorizar, firmarToken };
