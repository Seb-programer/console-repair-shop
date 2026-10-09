const { solicitudInvalida } = require('./HttpError');

const ROLES = ['administrador', 'tecnico', 'operario'];
const ESTADOS_CONSOLA = ['en_espera', 'en_proceso', 'finalizado'];
const RESULTADOS_REPARACION = ['pendiente', 'reparada', 'no_reparable'];
const ESTADOS_REPUESTO = ['pendiente', 'pedido', 'conseguido'];
const MAX_INT = 2147483647;

function estaVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

/** Devuelve el texto recortado o null si viene vacío. */
function textoOpcional(valor, campo, max = 255) {
  if (estaVacio(valor)) return null;
  const texto = String(valor).trim();
  if (texto.length > max) throw solicitudInvalida(`El campo "${campo}" admite como máximo ${max} caracteres`);
  return texto;
}

function textoObligatorio(valor, campo, max = 255) {
  if (estaVacio(valor)) throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  return textoOpcional(valor, campo, max);
}

function enumValido(valor, permitidos, campo) {
  if (estaVacio(valor)) throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  const v = String(valor).trim();
  if (!permitidos.includes(v)) {
    throw solicitudInvalida(`El campo "${campo}" debe ser uno de: ${permitidos.join(', ')}`);
  }
  return v;
}

/** Entero > 0 (acepta strings numéricas, p. ej. de multipart). */
function enteroPositivo(valor, campo) {
  if (estaVacio(valor)) throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw solicitudInvalida(`El campo "${campo}" debe ser un entero positivo`);
  return n;
}

/** Entero >= 0. */
function enteroNoNegativo(valor, campo) {
  if (estaVacio(valor)) throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0) throw solicitudInvalida(`El campo "${campo}" debe ser un entero mayor o igual a 0`);
  return n;
}

/** Número > 0 con máximo 2 decimales (precios). */
function precioValido(valor, campo) {
  if (estaVacio(valor)) throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) throw solicitudInvalida(`El campo "${campo}" debe ser un número positivo`);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) {
    throw solicitudInvalida(`El campo "${campo}" admite como máximo 2 decimales`);
  }
  if (n >= 1e10) throw solicitudInvalida(`El campo "${campo}" es demasiado grande`);
  return Math.round(n * 100) / 100;
}

/** Número >= 0 con máximo 2 decimales, o null si viene vacío (costos estimados). */
function montoOpcional(valor, campo) {
  if (estaVacio(valor)) return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) throw solicitudInvalida(`El campo "${campo}" debe ser un número mayor o igual a 0`);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) {
    throw solicitudInvalida(`El campo "${campo}" admite como máximo 2 decimales`);
  }
  if (n >= 1e10) throw solicitudInvalida(`El campo "${campo}" es demasiado grande`);
  return Math.round(n * 100) / 100;
}

/**
 * Normaliza un número de documento: quita espacios, puntos y guiones.
 * "1.234.567-8" → "12345678". Devuelve null si queda vacío.
 */
function normalizarDocumento(valor) {
  if (estaVacio(valor)) return null;
  const doc = String(valor).replace(/[\s.\-]/g, '');
  return doc === '' ? null : doc;
}

/** URL http(s) opcional (redes sociales). */
function urlOpcional(valor, campo, max = 255) {
  const texto = textoOpcional(valor, campo, max);
  if (texto && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(texto)) {
    throw solicitudInvalida(`El campo "${campo}" debe ser una URL que empiece por http:// o https://`);
  }
  return texto;
}

function emailOpcional(valor, campo = 'email') {
  const texto = textoOpcional(valor, campo, 150);
  if (texto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) throw solicitudInvalida(`El campo "${campo}" no es un correo válido`);
  return texto;
}

/** Interpreta booleanos de JSON o multipart ("true", "1", "false", "0"). */
function booleano(valor, campo) {
  if (typeof valor === 'boolean') return valor;
  if (valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === 0 || valor === '0' || valor === 'false') return false;
  throw solicitudInvalida(`El campo "${campo}" debe ser verdadero o falso`);
}

/** Valida el parámetro :id de la ruta. */
function idParam(valor, nombre = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw solicitudInvalida(`El parámetro "${nombre}" no es válido`);
  return n;
}

const MENSAJE_POLITICA_PASSWORD = 'La contraseña debe tener al menos 8 caracteres e incluir letras y números';

/**
 * Política de contraseñas al crear o cambiar: 8-72 caracteres, con al menos una letra y un número.
 * (72 es el máximo que bcrypt tiene en cuenta.) No afecta a contraseñas ya guardadas.
 */
function validarPassword(password) {
  if (estaVacio(password)) throw solicitudInvalida('El campo "password" es obligatorio');
  const texto = String(password);
  if (texto.length > 72) throw solicitudInvalida('La contraseña admite como máximo 72 caracteres');
  if (texto.length < 8 || !/\p{L}/u.test(texto) || !/\p{Nd}/u.test(texto)) {
    throw solicitudInvalida(MENSAJE_POLITICA_PASSWORD);
  }
  return texto;
}

module.exports = {
  ROLES,
  ESTADOS_CONSOLA,
  RESULTADOS_REPARACION,
  ESTADOS_REPUESTO,
  MAX_INT,
  estaVacio,
  textoOpcional,
  textoObligatorio,
  enumValido,
  enteroPositivo,
  enteroNoNegativo,
  precioValido,
  montoOpcional,
  normalizarDocumento,
  urlOpcional,
  emailOpcional,
  booleano,
  idParam,
  validarPassword,
  MENSAJE_POLITICA_PASSWORD,
};
