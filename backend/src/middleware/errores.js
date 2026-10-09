const multer = require('multer');
const { HttpError } = require('../utils/HttpError');
const { archivosDeRequest, borrarArchivos } = require('../utils/archivos');

const MENSAJES_MULTER = {
  LIMIT_FILE_SIZE: 'Cada imagen puede pesar como máximo 5 MB',
  LIMIT_FILE_COUNT: 'Se permiten como máximo 10 imágenes por petición',
  LIMIT_UNEXPECTED_FILE: 'Campo de archivo no esperado o demasiadas imágenes (máximo 10)',
  LIMIT_PART_COUNT: 'La petición tiene demasiadas partes',
  LIMIT_FIELD_COUNT: 'La petición tiene demasiados campos',
  LIMIT_FIELD_VALUE: 'Uno de los campos es demasiado largo',
};

/** Mensaje claro según el índice único violado (nombres de database/schema.sql). */
function mensajeDuplicado(sqlMessage = '') {
  if (sqlMessage.includes('uq_usuarios_usuario')) return 'Ya existe un usuario con ese nombre de usuario';
  if (sqlMessage.includes('uq_clientes_documento')) return 'Ya existe un cliente con ese documento';
  return 'Ya existe un registro con ese valor único';
}

function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

/** Traduce cualquier error a { status, mensaje } sin exponer detalles internos. */
function traducirError(err) {
  if (err instanceof HttpError) return { status: err.status, mensaje: err.message };
  if (err instanceof multer.MulterError) {
    return { status: 400, mensaje: MENSAJES_MULTER[err.code] || 'Error al subir los archivos' };
  }
  if (err.type === 'entity.parse.failed') return { status: 400, mensaje: 'El cuerpo de la petición no es JSON válido' };
  if (err.type === 'entity.too.large') return { status: 413, mensaje: 'El cuerpo de la petición es demasiado grande' };

  // CHECK violado: MariaDB 4025 (ER_CONSTRAINT_FAILED) / MySQL 3819 (ER_CHECK_CONSTRAINT_VIOLATED).
  if (err.errno === 4025 || err.errno === 3819) {
    return { status: 400, mensaje: 'Los datos no cumplen las restricciones (por ejemplo, valores negativos)' };
  }
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return { status: 409, mensaje: mensajeDuplicado(err.sqlMessage) };
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return { status: 400, mensaje: 'Hace referencia a un registro que no existe' };
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return { status: 409, mensaje: 'No se puede eliminar: el registro tiene otros registros asociados' };
    case 'ER_DATA_TOO_LONG':
      return { status: 400, mensaje: 'Uno de los campos supera la longitud permitida' };
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
      return { status: 503, mensaje: 'Base de datos no disponible' };
    default:
      return { status: 500, mensaje: 'Error interno del servidor' };
  }
}

// Express reconoce el manejador de errores por sus 4 parámetros.
// eslint-disable-next-line no-unused-vars
async function manejadorErrores(err, req, res, next) {
  // Si la petición falló después de subir archivos, se borran del disco.
  await borrarArchivos(archivosDeRequest(req));
  const { status, mensaje } = traducirError(err);
  // Se registra en la consola con fecha; al cliente nunca se le envía el detalle ni el stack.
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}:`, err);
  }
  if (res.headersSent) return;
  res.status(status).json({ error: mensaje });
}

module.exports = { rutaNoEncontrada, manejadorErrores, traducirError };
