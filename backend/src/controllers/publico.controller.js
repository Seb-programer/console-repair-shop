const { HttpError } = require('../utils/HttpError');
const { textoOpcional, normalizarDocumento } = require('../utils/validacion');
const servicio = require('../services/publico.service');
const { obtenerNegocio } = require('../services/negocio.service');

async function negocio(req, res) {
  res.json(await obtenerNegocio());
}

async function galeria(req, res) {
  res.json(await servicio.listarGaleriaVisible());
}

async function articulos(req, res) {
  res.json(await servicio.listarArticulos(textoOpcional(req.query.q, 'q', 100)));
}

async function consulta(req, res) {
  const documento = normalizarDocumento(textoOpcional(req.body?.documento, 'documento', 30));
  if (!documento) throw new HttpError(400, 'Escribe tu número de documento');
  const resultado = await servicio.consultarPorDocumento(documento);
  if (!resultado) throw new HttpError(404, servicio.MENSAJE_NO_ENCONTRADO);
  res.json(resultado);
}

module.exports = {
  negocio, galeria, articulos, consulta,
};
