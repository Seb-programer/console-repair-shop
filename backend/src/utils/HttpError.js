class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const errores = {
  solicitudInvalida: (m) => new HttpError(400, m),
  noAutenticado: (m = 'No autenticado') => new HttpError(401, m),
  prohibido: (m = 'No tiene permisos para realizar esta acción') => new HttpError(403, m),
  noEncontrado: (m = 'Recurso no encontrado') => new HttpError(404, m),
  conflicto: (m) => new HttpError(409, m),
};

module.exports = { HttpError, ...errores };
