const fs = require('fs/promises');
const path = require('path');
const config = require('../config/env');

/** Ruta pública que se guarda en BD para un archivo subido. */
function rutaPublica(archivo) {
  return `/uploads/${archivo.filename}`;
}

/** Lista plana de archivos subidos por multer (array o campos). */
function archivosDeRequest(req) {
  const lista = [];
  if (req.file) lista.push(req.file);
  if (Array.isArray(req.files)) lista.push(...req.files);
  else if (req.files && typeof req.files === 'object') Object.values(req.files).forEach((a) => lista.push(...a));
  return lista;
}

async function borrarArchivos(archivos) {
  await Promise.all(
    archivos.map((a) => fs.unlink(a.path).catch(() => {})),
  );
}

/** Borra un archivo a partir de su ruta pública "/uploads/x.jpg" (ignora errores). */
async function borrarPorRutaPublica(ruta) {
  if (!ruta || !ruta.startsWith('/uploads/')) return;
  const nombre = path.basename(ruta);
  await fs.unlink(path.join(config.uploadsDir, nombre)).catch(() => {});
}

module.exports = { rutaPublica, archivosDeRequest, borrarArchivos, borrarPorRutaPublica };
