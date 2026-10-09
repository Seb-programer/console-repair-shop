const { pool, enTransaccion } = require('../config/db');
const { noEncontrado } = require('../utils/HttpError');
const { rutaPublica } = require('../utils/archivos');

/**
 * Calcula los cambios de una consola al cambiar de estado.
 * - Si quien cambia es técnico, se le asigna la consola.
 * - Al pasar a 'finalizado' se fija fecha_finalizacion (si ya estaba finalizada se conserva).
 * - Al pasar a cualquier otro estado se limpia fecha_finalizacion.
 * Devuelve { estado, tecnicoId (undefined = no cambiar), finalizacion: 'fijar'|'conservar'|'limpiar' }.
 */
function calcularCambioEstado({ estadoActual, nuevoEstado, usuario }) {
  let finalizacion = 'limpiar';
  if (nuevoEstado === 'finalizado') finalizacion = estadoActual === 'finalizado' ? 'conservar' : 'fijar';
  return {
    estado: nuevoEstado,
    tecnicoId: usuario.rol === 'tecnico' ? usuario.id : undefined,
    finalizacion,
  };
}

/** Traduce un cambio de estado a la cláusula SET (las columnas son fijas; los valores van parametrizados). */
function sqlCambioEstado(cambio) {
  const sets = ['estado = ?'];
  const params = [cambio.estado];
  if (cambio.tecnicoId !== undefined) {
    sets.push('tecnico_id = ?');
    params.push(cambio.tecnicoId);
  }
  if (cambio.finalizacion === 'fijar') sets.push('fecha_finalizacion = NOW()');
  if (cambio.finalizacion === 'limpiar') sets.push('fecha_finalizacion = NULL');
  return { sets: sets.join(', '), params };
}

async function bloquearConsola(cx, id) {
  const [filas] = await cx.query('SELECT id, estado FROM consolas WHERE id = ? FOR UPDATE', [id]);
  if (!filas.length) throw noEncontrado('Consola no encontrada');
  return filas[0];
}

async function aplicarCambioEstado(cx, consolaId, cambio) {
  const { sets, params } = sqlCambioEstado(cambio);
  await cx.query(`UPDATE consolas SET ${sets} WHERE id = ?`, [...params, consolaId]);
}

async function cambiarEstado({ consolaId, nuevoEstado, usuario }) {
  await enTransaccion(async (cx) => {
    const consola = await bloquearConsola(cx, consolaId);
    const cambio = calcularCambioEstado({ estadoActual: consola.estado, nuevoEstado, usuario });
    await aplicarCambioEstado(cx, consolaId, cambio);
  });
}

async function registrarProcedimiento({
  consolaId, descripcion, estadoResultante, interno = false, usuario, archivos,
}) {
  return enTransaccion(async (cx) => {
    const consola = await bloquearConsola(cx, consolaId);
    const [proc] = await cx.query(
      'INSERT INTO procedimientos (consola_id, tecnico_id, descripcion, estado_resultante, interno) VALUES (?, ?, ?, ?, ?)',
      [consolaId, usuario.id, descripcion, estadoResultante, interno ? 1 : 0],
    );
    for (const archivo of archivos) {
      await cx.query(
        'INSERT INTO fotos_procedimiento (procedimiento_id, ruta) VALUES (?, ?)',
        [proc.insertId, rutaPublica(archivo)],
      );
    }
    const cambio = calcularCambioEstado({ estadoActual: consola.estado, nuevoEstado: estadoResultante, usuario });
    await aplicarCambioEstado(cx, consolaId, cambio);
    return proc.insertId;
  });
}

/**
 * Guarda el reporte de reparación. Si lo hace un técnico y la consola no tiene
 * técnico asignado, se le asigna. `diagnostico` / `necesitaRepuestos` undefined = no cambiar.
 */
async function guardarReparacion({
  consolaId, resultado, diagnostico, necesitaRepuestos, usuario,
}) {
  const sets = ['resultado_reparacion = ?'];
  const params = [resultado];
  if (diagnostico !== undefined) {
    sets.push('diagnostico_resultado = ?');
    params.push(diagnostico);
  }
  if (necesitaRepuestos !== undefined) {
    sets.push('necesita_repuestos = ?');
    params.push(necesitaRepuestos ? 1 : 0);
  }
  if (usuario.rol === 'tecnico') {
    sets.push('tecnico_id = COALESCE(tecnico_id, ?)');
    params.push(usuario.id);
  }
  const [r] = await pool.query(`UPDATE consolas SET ${sets.join(', ')} WHERE id = ?`, [...params, consolaId]);
  if (!r.affectedRows) throw noEncontrado('Consola no encontrada');
}

async function listarRepuestos(consolaId) {
  const [filas] = await pool.query(
    `SELECT r.id, r.consola_id, r.nombre, r.cantidad, r.costo_estimado, r.estado, r.notas,
            r.registrado_por, u.nombre AS registrado_por_nombre, r.creado_en, r.actualizado_en
       FROM repuestos_consola r LEFT JOIN usuarios u ON u.id = r.registrado_por
      WHERE r.consola_id = ? ORDER BY r.id`,
    [consolaId],
  );
  return filas;
}

async function obtenerConsola(id) {
  const [consolas] = await pool.query(
    `SELECT co.*, cl.nombre AS cliente_nombre, cl.documento AS cliente_documento,
            cl.telefono AS cliente_telefono, cl.email AS cliente_email, cl.direccion AS cliente_direccion,
            r.nombre AS recibido_por_nombre, t.nombre AS tecnico_nombre
       FROM consolas co
       JOIN clientes cl ON cl.id = co.cliente_id
       LEFT JOIN usuarios r ON r.id = co.recibido_por
       LEFT JOIN usuarios t ON t.id = co.tecnico_id
      WHERE co.id = ?`,
    [id],
  );
  if (!consolas.length) return null;

  const [fotos] = await pool.query(
    `SELECT f.id, f.ruta, f.descripcion, f.subido_por, u.nombre AS subido_por_nombre, f.creado_en
       FROM fotos_consola f LEFT JOIN usuarios u ON u.id = f.subido_por
      WHERE f.consola_id = ? ORDER BY f.id`,
    [id],
  );
  const [procedimientos] = await pool.query(
    `SELECT p.id, p.descripcion, p.estado_resultante, p.interno, p.tecnico_id, u.nombre AS tecnico_nombre, p.creado_en
       FROM procedimientos p LEFT JOIN usuarios u ON u.id = p.tecnico_id
      WHERE p.consola_id = ? ORDER BY p.creado_en, p.id`,
    [id],
  );
  procedimientos.forEach((p) => { p.fotos = []; });
  if (procedimientos.length) {
    const [fotosProc] = await pool.query(
      'SELECT id, procedimiento_id, ruta, creado_en FROM fotos_procedimiento WHERE procedimiento_id IN (?) ORDER BY id',
      [procedimientos.map((p) => p.id)],
    );
    const porId = new Map(procedimientos.map((p) => [p.id, p]));
    fotosProc.forEach((f) => porId.get(f.procedimiento_id)?.fotos.push(f));
  }

  const {
    cliente_nombre, cliente_documento, cliente_telefono, cliente_email, cliente_direccion, ...consola
  } = consolas[0];
  return {
    ...consola,
    cliente: {
      id: consola.cliente_id,
      nombre: cliente_nombre,
      documento: cliente_documento,
      telefono: cliente_telefono,
      email: cliente_email,
      direccion: cliente_direccion,
    },
    fotos,
    procedimientos,
    repuestos: await listarRepuestos(id),
  };
}

module.exports = {
  calcularCambioEstado,
  sqlCambioEstado,
  cambiarEstado,
  registrarProcedimiento,
  guardarReparacion,
  listarRepuestos,
  obtenerConsola,
};
