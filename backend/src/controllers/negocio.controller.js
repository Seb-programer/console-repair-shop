const { solicitudInvalida } = require('../utils/HttpError');
const {
  textoObligatorio, textoOpcional, emailOpcional, urlOpcional, booleano, estaVacio,
} = require('../utils/validacion');
const { rutaPublica, borrarPorRutaPublica } = require('../utils/archivos');
const servicio = require('../services/negocio.service');

/** Solo dígitos con indicativo: "+57 300-123 4567" → "573001234567"; vacío → null. */
function whatsappOpcional(valor) {
  const limpio = estaVacio(valor) ? null : String(valor).replace(/[\s+\-().]/g, '');
  const texto = textoOpcional(limpio, 'whatsapp', 20);
  if (texto && !/^[0-9]{7,15}$/.test(texto)) {
    throw solicitudInvalida('El campo "whatsapp" debe tener solo dígitos con indicativo (7 a 15), ej. 573001234567');
  }
  return texto;
}

const VALIDADORES = {
  nombre: (v) => textoObligatorio(v, 'nombre', 150),
  eslogan: (v) => textoOpcional(v, 'eslogan', 255),
  descripcion: (v) => textoOpcional(v, 'descripcion', 5000),
  direccion: (v) => textoOpcional(v, 'direccion', 255),
  telefono: (v) => textoOpcional(v, 'telefono', 30),
  whatsapp: whatsappOpcional,
  email: (v) => emailOpcional(v),
  horario: (v) => textoOpcional(v, 'horario', 255),
  facebook: (v) => urlOpcional(v, 'facebook'),
  instagram: (v) => urlOpcional(v, 'instagram'),
  tiktok: (v) => urlOpcional(v, 'tiktok'),
};

/**
 * Valida el cuerpo (multipart o JSON). Solo se actualizan los campos enviados;
 * un campo enviado vacío se guarda como null (salvo nombre, que es obligatorio).
 */
function datosNegocio(b = {}) {
  const datos = {};
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    if (b[campo] !== undefined) datos[campo] = validar(b[campo]);
  }
  return datos;
}

async function obtener(req, res) {
  res.json(await servicio.obtenerNegocio());
}

async function actualizar(req, res) {
  const datos = datosNegocio(req.body);
  const quitarLogo = !estaVacio(req.body?.quitar_logo) && booleano(req.body.quitar_logo, 'quitar_logo');
  const actual = await servicio.obtenerNegocio();
  if (actual.nombre === null && datos.nombre === undefined) throw solicitudInvalida('El campo "nombre" es obligatorio');

  if (req.file) datos.logo = rutaPublica(req.file);
  else if (quitarLogo) datos.logo = null;

  if (Object.keys(datos).length) await servicio.guardarNegocio(datos);
  if (actual.logo && datos.logo !== undefined && actual.logo !== datos.logo) await borrarPorRutaPublica(actual.logo);
  res.json(await servicio.obtenerNegocio());
}

module.exports = { obtener, actualizar, datosNegocio };
