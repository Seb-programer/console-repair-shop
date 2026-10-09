const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { firmarToken } = require('../middleware/auth');
const { noAutenticado } = require('../utils/HttpError');
const { textoObligatorio } = require('../utils/validacion');
const { limiteLogin } = require('../middleware/limiteIntentos');

// Hash ficticio para comparar aunque el usuario no exista (evita revelar usuarios por tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync('contraseña-inexistente', 10);

async function login(req, res) {
  const usuario = textoObligatorio(req.body?.usuario, 'usuario', 50);
  const password = textoObligatorio(req.body?.password, 'password', 72);
  limiteLogin.comprobar(req, res, usuario);

  const [filas] = await pool.query(
    'SELECT id, nombre, usuario, rol, activo, password_hash FROM usuarios WHERE usuario = ?',
    [usuario],
  );
  const encontrado = filas[0];
  const coincide = await bcrypt.compare(password, encontrado ? encontrado.password_hash : HASH_FICTICIO);

  // Mismo mensaje si no existe, si la contraseña no coincide o si está inactivo:
  // no se revela qué usuarios existen ni que una contraseña es correcta.
  if (!encontrado || !coincide || !encontrado.activo) {
    limiteLogin.registrarFallo(req, usuario);
    throw noAutenticado('Usuario o contraseña incorrectos');
  }
  limiteLogin.registrarExito(req, usuario);

  const datos = { id: encontrado.id, nombre: encontrado.nombre, usuario: encontrado.usuario, rol: encontrado.rol };
  res.json({ token: firmarToken(datos), usuario: datos });
}

async function me(req, res) {
  res.json(req.usuario);
}

module.exports = { login, me };
