const { pool, enTransaccion } = require('../config/db');
const { noEncontrado, solicitudInvalida } = require('../utils/HttpError');
const {
  ESTADOS_CONSOLA, RESULTADOS_REPARACION, textoObligatorio, textoOpcional, enumValido, enteroPositivo, idParam,
  booleano, estaVacio,
} = require('../utils/validacion');
const { rutaPublica, borrarPorRutaPublica } = require('../utils/archivos');
const servicio = require('../services/consolas.service');

const MAX_TEXTO = 5000;
const LIMITE_LISTADO = 500;

/** Valida los datos de recepción de una consola. */
function datosRecepcion(b = {}) {
  return {
    cliente_id: enteroPositivo(b.cliente_id, 'cliente_id'),
    marca: textoObligatorio(b.marca, 'marca', 60),
    modelo: textoObligatorio(b.modelo, 'modelo', 100),
    numero_serie: textoOpcional(b.numero_serie, 'numero_serie', 100),
    color: textoOpcional(b.color, 'color', 40),
    accesorios: textoOpcional(b.accesorios, 'accesorios', MAX_TEXTO),
    falla_reportada: textoObligatorio(b.falla_reportada, 'falla_reportada', MAX_TEXTO),
    observaciones_recepcion: textoOpcional(b.observaciones_recepcion, 'observaciones_recepcion', MAX_TEXTO),
  };
}

async function existeCliente(cx, id) {
  const [filas] = await cx.query('SELECT id FROM clientes WHERE id = ?', [id]);
  if (!filas.length) throw noEncontrado('El cliente no existe');
}

async function insertarFotos(cx, consolaId, archivos, usuarioId) {
  for (const archivo of archivos) {
    await cx.query(
      'INSERT INTO fotos_consola (consola_id, ruta, subido_por) VALUES (?, ?, ?)',
      [consolaId, rutaPublica(archivo), usuarioId],
    );
  }
}

async function listar(req, res) {
  const condiciones = [];
  const params = [];
  if (req.query.estado) {
    condiciones.push('co.estado = ?');
    params.push(enumValido(req.query.estado, ESTADOS_CONSOLA, 'estado'));
  }
  const q = textoOpcional(req.query.q, 'q', 100);
  if (q) {
    condiciones.push('(cl.nombre LIKE ? OR cl.documento LIKE ? OR co.marca LIKE ? OR co.modelo LIKE ? OR co.numero_serie LIKE ?)');
    const patron = `%${q}%`;
    params.push(patron, patron, patron, patron, patron);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT co.id, co.cliente_id, cl.nombre AS cliente_nombre, co.marca, co.modelo, co.numero_serie, co.color,
            co.falla_reportada, co.estado, co.tecnico_id, t.nombre AS tecnico_nombre,
            co.fecha_ingreso, co.fecha_finalizacion, co.resultado_reparacion, co.necesita_repuestos, co.actualizado_en
       FROM consolas co
       JOIN clientes cl ON cl.id = co.cliente_id
       LEFT JOIN usuarios t ON t.id = co.tecnico_id
       ${where}
      ORDER BY co.fecha_ingreso DESC, co.id DESC
      LIMIT ?`,
    [...params, LIMITE_LISTADO],
  );
  res.json(filas);
}

async function detalle(req, res) {
  const consola = await servicio.obtenerConsola(idParam(req.params.id));
  if (!consola) throw noEncontrado('Consola no encontrada');
  res.json(consola);
}

async function crear(req, res) {
  const d = datosRecepcion(req.body);
  const id = await enTransaccion(async (cx) => {
    await existeCliente(cx, d.cliente_id);
    const [r] = await cx.query(
      `INSERT INTO consolas (cliente_id, marca, modelo, numero_serie, color, accesorios, falla_reportada,
                             observaciones_recepcion, recibido_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.cliente_id, d.marca, d.modelo, d.numero_serie, d.color, d.accesorios, d.falla_reportada,
        d.observaciones_recepcion, req.usuario.id],
    );
    await insertarFotos(cx, r.insertId, req.files || [], req.usuario.id);
    return r.insertId;
  });
  res.status(201).json(await servicio.obtenerConsola(id));
}

async function actualizar(req, res) {
  const id = idParam(req.params.id);
  const d = datosRecepcion(req.body);
  await existeCliente(pool, d.cliente_id);
  const [r] = await pool.query(
    `UPDATE consolas SET cliente_id = ?, marca = ?, modelo = ?, numero_serie = ?, color = ?, accesorios = ?,
            falla_reportada = ?, observaciones_recepcion = ?
      WHERE id = ?`,
    [d.cliente_id, d.marca, d.modelo, d.numero_serie, d.color, d.accesorios, d.falla_reportada,
      d.observaciones_recepcion, id],
  );
  if (!r.affectedRows) throw noEncontrado('Consola no encontrada');
  res.json(await servicio.obtenerConsola(id));
}

async function agregarFotos(req, res) {
  const id = idParam(req.params.id);
  if (!req.files || !req.files.length) throw solicitudInvalida('Debe adjuntar al menos una foto');
  await enTransaccion(async (cx) => {
    const [filas] = await cx.query('SELECT id FROM consolas WHERE id = ?', [id]);
    if (!filas.length) throw noEncontrado('Consola no encontrada');
    await insertarFotos(cx, id, req.files, req.usuario.id);
  });
  res.status(201).json(await servicio.obtenerConsola(id));
}

async function cambiarEstado(req, res) {
  const id = idParam(req.params.id);
  const estado = enumValido(req.body?.estado, ESTADOS_CONSOLA, 'estado');
  await servicio.cambiarEstado({ consolaId: id, nuevoEstado: estado, usuario: req.usuario });
  res.json(await servicio.obtenerConsola(id));
}

async function registrarProcedimiento(req, res) {
  const id = idParam(req.params.id);
  const descripcion = textoObligatorio(req.body?.descripcion, 'descripcion', MAX_TEXTO);
  const estadoResultante = enumValido(req.body?.estado_resultante, ESTADOS_CONSOLA, 'estado_resultante');
  const interno = estaVacio(req.body?.interno) ? false : booleano(req.body.interno, 'interno');
  const procedimientoId = await servicio.registrarProcedimiento({
    consolaId: id, descripcion, estadoResultante, interno, usuario: req.usuario, archivos: req.files || [],
  });
  const consola = await servicio.obtenerConsola(id);
  res.status(201).json({ procedimiento_id: procedimientoId, consola });
}

/**
 * Valida el reporte de reparación. `diagnostico_resultado` y `necesita_repuestos` son
 * opcionales: si no vienen, no cambian (diagnóstico enviado vacío o null = se borra).
 */
function datosReparacion(b = {}) {
  return {
    resultado: enumValido(b.resultado_reparacion, RESULTADOS_REPARACION, 'resultado_reparacion'),
    diagnostico: b.diagnostico_resultado === undefined
      ? undefined
      : textoOpcional(b.diagnostico_resultado, 'diagnostico_resultado', MAX_TEXTO),
    necesitaRepuestos: estaVacio(b.necesita_repuestos) ? undefined : booleano(b.necesita_repuestos, 'necesita_repuestos'),
  };
}

async function guardarReparacion(req, res) {
  const id = idParam(req.params.id);
  const d = datosReparacion(req.body);
  await servicio.guardarReparacion({ consolaId: id, ...d, usuario: req.usuario });
  res.json(await servicio.obtenerConsola(id));
}

async function eliminar(req, res) {
  const id = idParam(req.params.id);
  // Se recogen las rutas antes de borrar: ON DELETE CASCADE elimina las filas, no los archivos.
  const [fotos] = await pool.query(
    `SELECT ruta FROM fotos_consola WHERE consola_id = ?
     UNION ALL
     SELECT fp.ruta FROM fotos_procedimiento fp
       JOIN procedimientos p ON p.id = fp.procedimiento_id
      WHERE p.consola_id = ?`,
    [id, id],
  );
  const [r] = await pool.query('DELETE FROM consolas WHERE id = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('Consola no encontrada');
  await Promise.all(fotos.map((f) => borrarPorRutaPublica(f.ruta)));
  res.json({ mensaje: 'Consola eliminada' });
}

module.exports = {
  listar,
  detalle,
  crear,
  actualizar,
  agregarFotos,
  cambiarEstado,
  registrarProcedimiento,
  guardarReparacion,
  eliminar,
  datosRecepcion,
  datosReparacion,
};
