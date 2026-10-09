const { pool } = require('../config/db');

const LIMITE_ARTICULOS = 500;
// Mismo mensaje si el documento no existe o no tiene consolas (no revela si alguien es cliente).
const MENSAJE_NO_ENCONTRADO = 'No encontramos consolas registradas con ese documento';

/** Solo el primer nombre: "Juan Carlos Pérez" → "Juan". */
function primerNombre(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/);
  return partes[0] || '';
}

/**
 * Últimos 4 caracteres del número de serie. Si la serie tiene 4 caracteres o
 * menos se devuelve null, porque mostrarla sería mostrar la serie completa.
 */
function serieFinal(numeroSerie) {
  if (!numeroSerie) return null;
  const serie = String(numeroSerie).trim();
  return serie.length > 4 ? serie.slice(-4) : null;
}

/**
 * Arma la vista pública de una consola con una lista blanca de campos.
 * Nunca incluye: documento, contacto, serie completa, observaciones_recepcion,
 * usuarios internos ni procedimientos internos.
 */
function consolaPublica(consola, { repuestos = [], fotos = [], procedimientos = [], fotosProcedimiento = [] } = {}) {
  const fotosPorProc = new Map();
  for (const f of fotosProcedimiento) {
    if (!fotosPorProc.has(f.procedimiento_id)) fotosPorProc.set(f.procedimiento_id, []);
    fotosPorProc.get(f.procedimiento_id).push(f.ruta);
  }
  return {
    id: consola.id,
    marca: consola.marca,
    modelo: consola.modelo,
    color: consola.color,
    serie_final: serieFinal(consola.numero_serie),
    falla_reportada: consola.falla_reportada,
    estado: consola.estado,
    fecha_ingreso: consola.fecha_ingreso,
    fecha_finalizacion: consola.fecha_finalizacion,
    resultado_reparacion: consola.resultado_reparacion,
    diagnostico_resultado: consola.diagnostico_resultado,
    necesita_repuestos: Boolean(consola.necesita_repuestos),
    repuestos: repuestos.map((r) => ({
      nombre: r.nombre, cantidad: r.cantidad, costo_estimado: r.costo_estimado, estado: r.estado,
    })),
    fotos: fotos.map((f) => ({ ruta: f.ruta, descripcion: f.descripcion })),
    procedimientos: procedimientos
      .filter((p) => !p.interno)
      .map((p) => ({
        descripcion: p.descripcion,
        estado_resultante: p.estado_resultante,
        creado_en: p.creado_en,
        fotos: fotosPorProc.get(p.id) || [],
      })),
  };
}

/** Agrupa filas por una columna: [{consola_id:1,…}] → Map(1 → [...]) */
function agrupar(filas, clave) {
  const mapa = new Map();
  for (const f of filas) {
    if (!mapa.has(f[clave])) mapa.set(f[clave], []);
    mapa.get(f[clave]).push(f);
  }
  return mapa;
}

/**
 * Busca el cliente por documento normalizado. Los documentos guardados antes de
 * la normalización pueden tener puntos, espacios o guiones, así que se compara
 * normalizando también la columna (se prefiere la coincidencia exacta).
 */
async function buscarCliente(documento) {
  const [filas] = await pool.query(
    `SELECT id, nombre FROM clientes
      WHERE documento = ?
         OR REPLACE(REPLACE(REPLACE(documento, ' ', ''), '.', ''), '-', '') = ?
      ORDER BY (documento = ?) DESC, id
      LIMIT 1`,
    [documento, documento, documento],
  );
  return filas[0] || null;
}

/** Devuelve { cliente:{nombre_corto}, consolas:[...] } o null si no hay nada que mostrar. */
async function consultarPorDocumento(documento) {
  const cliente = await buscarCliente(documento);
  if (!cliente) return null;

  const [consolas] = await pool.query(
    `SELECT id, marca, modelo, color, numero_serie, falla_reportada, estado, fecha_ingreso, fecha_finalizacion,
            resultado_reparacion, diagnostico_resultado, necesita_repuestos
       FROM consolas WHERE cliente_id = ?
      ORDER BY fecha_ingreso DESC, id DESC`,
    [cliente.id],
  );
  if (!consolas.length) return null;

  const ids = consolas.map((c) => c.id);
  const [[repuestos], [fotos], [procedimientos]] = await Promise.all([
    pool.query(
      `SELECT consola_id, nombre, cantidad, costo_estimado, estado
         FROM repuestos_consola WHERE consola_id IN (?) ORDER BY id`,
      [ids],
    ),
    pool.query('SELECT consola_id, ruta, descripcion FROM fotos_consola WHERE consola_id IN (?) ORDER BY id', [ids]),
    // El filtro de internos se hace en SQL y otra vez en consolaPublica (defensa en profundidad).
    pool.query(
      `SELECT id, consola_id, descripcion, estado_resultante, interno, creado_en
         FROM procedimientos WHERE consola_id IN (?) AND interno = 0
        ORDER BY creado_en, id`,
      [ids],
    ),
  ]);
  let fotosProc = [];
  if (procedimientos.length) {
    [fotosProc] = await pool.query(
      'SELECT procedimiento_id, ruta FROM fotos_procedimiento WHERE procedimiento_id IN (?) ORDER BY id',
      [procedimientos.map((p) => p.id)],
    );
  }

  const repPorConsola = agrupar(repuestos, 'consola_id');
  const fotosPorConsola = agrupar(fotos, 'consola_id');
  const procPorConsola = agrupar(procedimientos, 'consola_id');
  return {
    cliente: { nombre_corto: primerNombre(cliente.nombre) },
    consolas: consolas.map((c) => consolaPublica(c, {
      repuestos: repPorConsola.get(c.id),
      fotos: fotosPorConsola.get(c.id),
      procedimientos: procPorConsola.get(c.id),
      fotosProcedimiento: fotosProc,
    })),
  };
}

async function listarArticulos(q) {
  const params = [];
  let filtro = '';
  if (q) {
    filtro = 'AND (nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ?)';
    const patron = `%${q}%`;
    params.push(patron, patron, patron);
  }
  // No se expone el stock exacto, solo si hay disponibilidad.
  const [filas] = await pool.query(
    `SELECT id, nombre, descripcion, categoria, precio, foto, (stock > 0) AS disponible
       FROM articulos WHERE activo = 1 ${filtro}
      ORDER BY nombre LIMIT ?`,
    [...params, LIMITE_ARTICULOS],
  );
  return filas.map((a) => ({ ...a, disponible: Boolean(a.disponible) }));
}

async function listarGaleriaVisible() {
  const [filas] = await pool.query(
    `SELECT id, tipo, ruta, titulo, descripcion, orden, creado_en
       FROM galeria WHERE visible = 1
      ORDER BY orden, creado_en DESC, id DESC`,
  );
  return filas;
}

module.exports = {
  MENSAJE_NO_ENCONTRADO,
  primerNombre,
  serieFinal,
  consolaPublica,
  consultarPorDocumento,
  listarArticulos,
  listarGaleriaVisible,
};
