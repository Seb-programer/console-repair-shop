const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config/env');
const { solicitudInvalida } = require('../utils/HttpError');

const TIPOS_IMAGEN = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const TIPOS_VIDEO = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};
const TODOS_LOS_TIPOS = { ...TIPOS_IMAGEN, ...TIPOS_VIDEO };
const EXTENSIONES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};
const MAX_TAMANO = 5 * 1024 * 1024;
const MAX_TAMANO_VIDEO = 100 * 1024 * 1024;
const MAX_ARCHIVOS = 10;

const MENSAJE_IMAGEN = 'Solo se permiten imágenes JPG, PNG o WEBP';
const MENSAJE_GALERIA = 'Solo se permiten imágenes JPG, PNG o WEBP o videos MP4 o WEBM';

fs.mkdirSync(config.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadsDir),
  filename: (req, file, cb) => {
    const nombre = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${TODOS_LOS_TIPOS[file.mimetype]}`;
    cb(null, nombre);
  },
});

/** Filtro por mimetype declarado y extensión (el contenido real se verifica después). */
function crearFiltro(tipos, mensaje) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!tipos[file.mimetype] || !EXTENSIONES[file.mimetype].includes(ext)) {
      return cb(solicitudInvalida(mensaje));
    }
    return cb(null, true);
  };
}

const upload = multer({
  storage,
  fileFilter: crearFiltro(TIPOS_IMAGEN, MENSAJE_IMAGEN),
  limits: { fileSize: MAX_TAMANO, files: MAX_ARCHIVOS },
});

// Galería: el límite de multer es el mayor (video); el de imagen (5 MB) se
// comprueba después según el tipo real del contenido.
const uploadGaleria = multer({
  storage,
  fileFilter: crearFiltro(TODOS_LOS_TIPOS, MENSAJE_GALERIA),
  limits: { fileSize: MAX_TAMANO_VIDEO, files: 1 },
});

/**
 * Firma (magic bytes) de cada tipo permitido. El mimetype lo declara el cliente,
 * así que se comprueba el contenido real: un .txt renombrado a .png se rechaza.
 */
function tipoReal(cabecera) {
  if (cabecera.length >= 3 && cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff) return 'image/jpeg';
  if (cabecera.length >= 8 && cabecera.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (cabecera.length >= 12 && cabecera.toString('latin1', 0, 4) === 'RIFF' && cabecera.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  // MP4 (ISO BMFF): los bytes 4-7 son "ftyp".
  if (cabecera.length >= 8 && cabecera.toString('latin1', 4, 8) === 'ftyp') return 'video/mp4';
  // WEBM (EBML): empieza por 1A 45 DF A3.
  if (cabecera.length >= 4 && cabecera.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  return null;
}

async function leerCabecera(ruta) {
  const fh = await fs.promises.open(ruta, 'r');
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/** Crea un middleware que rechaza (400) si algún archivo no es realmente del tipo que declara. */
function crearVerificador(descripcion) {
  return async function verificarContenido(req, res, next) {
    const archivos = [];
    if (req.file) archivos.push(req.file);
    if (Array.isArray(req.files)) archivos.push(...req.files);
    for (const archivo of archivos) {
      if (tipoReal(await leerCabecera(archivo.path)) !== archivo.mimetype) {
        // El manejador de errores central borra todos los archivos de la petición.
        return next(solicitudInvalida(`El archivo "${archivo.originalname}" no es ${descripcion} válido`));
      }
    }
    return next();
  };
}

const verificarContenido = crearVerificador('una imagen JPG, PNG o WEBP');
const verificarContenidoGaleria = crearVerificador('una imagen JPG, PNG o WEBP ni un video MP4 o WEBM');

/** Deduce el tipo de galería del contenido ya verificado; las imágenes no pueden superar 5 MB. */
function clasificarGaleria(req, res, next) {
  if (!req.file) return next();
  const esVideo = Boolean(TIPOS_VIDEO[req.file.mimetype]);
  if (!esVideo && req.file.size > MAX_TAMANO) {
    return next(solicitudInvalida('Las imágenes pueden pesar como máximo 5 MB'));
  }
  req.file.tipoGaleria = esVideo ? 'video' : 'foto';
  return next();
}

/** Ejecuta multer de galería traduciendo sus errores (los genéricos hablan de imágenes de 5 MB). */
function recibirArchivoGaleria(req, res, next) {
  uploadGaleria.single('archivo')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(solicitudInvalida('Los videos pueden pesar como máximo 100 MB y las imágenes 5 MB'));
    }
    if (err instanceof multer.MulterError && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
      return next(solicitudInvalida('Envíe un solo archivo en el campo "archivo"'));
    }
    return next(err);
  });
}

/** Convierte req.files ({fotos, 'fotos[]'}) en un array plano. */
function unificarFotos(req, res, next) {
  const f = req.files || {};
  req.files = [...(f.fotos || []), ...(f['fotos[]'] || [])];
  next();
}

// Si multer falla, él mismo borra lo ya escrito; si falla el controlador,
// el manejador de errores central borra los archivos de req.files / req.file.
module.exports = {
  // Se acepta el campo 'fotos' y también 'fotos[]' (notación de array en FormData).
  subirFotos: [
    upload.fields([{ name: 'fotos', maxCount: MAX_ARCHIVOS }, { name: 'fotos[]', maxCount: MAX_ARCHIVOS }]),
    unificarFotos,
    verificarContenido,
  ],
  subirFoto: [upload.single('foto'), verificarContenido],
  subirLogo: [upload.single('logo'), verificarContenido],
  subirArchivoGaleria: [recibirArchivoGaleria, verificarContenidoGaleria, clasificarGaleria],
  MAX_ARCHIVOS,
  MAX_TAMANO,
  MAX_TAMANO_VIDEO,
  tipoReal,
};
