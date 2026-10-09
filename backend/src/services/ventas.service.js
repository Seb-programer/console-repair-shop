const { pool, enTransaccion } = require('../config/db');
const { solicitudInvalida, noEncontrado, conflicto } = require('../utils/HttpError');
const { enteroPositivo } = require('../utils/validacion');

const MAX_ITEMS = 100;

/** Pasa un importe a centavos para operar sin errores de coma flotante. */
function aCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

/**
 * Valida y normaliza los ítems de una venta. Agrupa artículos repetidos
 * sumando sus cantidades. Devuelve [{articulo_id, cantidad}].
 */
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw solicitudInvalida('La venta debe incluir al menos un artículo');
  }
  if (items.length > MAX_ITEMS) throw solicitudInvalida(`La venta admite como máximo ${MAX_ITEMS} artículos`);

  const agrupados = new Map();
  items.forEach((item, i) => {
    if (!item || typeof item !== 'object') throw solicitudInvalida(`El ítem ${i + 1} no es válido`);
    const articuloId = enteroPositivo(item.articulo_id, `items[${i}].articulo_id`);
    const cantidad = enteroPositivo(item.cantidad, `items[${i}].cantidad`);
    agrupados.set(articuloId, (agrupados.get(articuloId) || 0) + cantidad);
  });
  return [...agrupados].map(([articulo_id, cantidad]) => ({ articulo_id, cantidad }));
}

/**
 * Calcula subtotales y total a partir de los ítems y el precio actual de cada artículo.
 * @param items [{articulo_id, cantidad}]
 * @param precios Map articulo_id -> precio
 * @returns {{detalle: Array<{articulo_id,cantidad,precio_unitario,subtotal}>, total: number}}
 */
function calcularTotales(items, precios) {
  let totalCentavos = 0;
  const detalle = items.map(({ articulo_id, cantidad }) => {
    if (!precios.has(articulo_id)) throw noEncontrado(`El artículo ${articulo_id} no existe`);
    const precioCentavos = aCentavos(precios.get(articulo_id));
    const subtotalCentavos = precioCentavos * cantidad;
    totalCentavos += subtotalCentavos;
    return {
      articulo_id,
      cantidad,
      precio_unitario: precioCentavos / 100,
      subtotal: subtotalCentavos / 100,
    };
  });
  return { detalle, total: totalCentavos / 100 };
}

/** Comprueba que todos los artículos existan, estén activos y tengan stock suficiente. */
function verificarDisponibilidad(items, articulosPorId) {
  for (const { articulo_id, cantidad } of items) {
    const articulo = articulosPorId.get(articulo_id);
    if (!articulo) throw noEncontrado(`El artículo ${articulo_id} no existe`);
    if (!articulo.activo) throw solicitudInvalida(`El artículo "${articulo.nombre}" no está disponible`);
    if (articulo.stock < cantidad) {
      throw conflicto(`Stock insuficiente para "${articulo.nombre}" (disponible: ${articulo.stock}, solicitado: ${cantidad})`);
    }
  }
}

async function crearVenta({ clienteId, items, usuarioId }) {
  const itemsNormalizados = normalizarItems(items);

  return enTransaccion(async (cx) => {
    if (clienteId) {
      const [clientes] = await cx.query('SELECT id FROM clientes WHERE id = ?', [clienteId]);
      if (!clientes.length) throw noEncontrado('El cliente no existe');
    }

    const ids = itemsNormalizados.map((i) => i.articulo_id);
    // Bloquea las filas de los artículos para que el stock no cambie durante la venta.
    const [articulos] = await cx.query(
      'SELECT id, nombre, precio, stock, activo FROM articulos WHERE id IN (?) ORDER BY id FOR UPDATE',
      [ids],
    );
    const articulosPorId = new Map(articulos.map((a) => [a.id, a]));
    verificarDisponibilidad(itemsNormalizados, articulosPorId);

    const precios = new Map(articulos.map((a) => [a.id, a.precio]));
    const { detalle, total } = calcularTotales(itemsNormalizados, precios);

    const [venta] = await cx.query(
      'INSERT INTO ventas (cliente_id, usuario_id, total) VALUES (?, ?, ?)',
      [clienteId || null, usuarioId, total],
    );
    for (const d of detalle) {
      await cx.query(
        'INSERT INTO detalle_venta (venta_id, articulo_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [venta.insertId, d.articulo_id, d.cantidad, d.precio_unitario, d.subtotal],
      );
      await cx.query('UPDATE articulos SET stock = stock - ? WHERE id = ?', [d.cantidad, d.articulo_id]);
    }
    return venta.insertId;
  });
}

async function obtenerVenta(id) {
  const [ventas] = await pool.query(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre, c.documento AS cliente_documento,
            v.usuario_id, u.nombre AS usuario_nombre, v.total, v.fecha
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.id = ?`,
    [id],
  );
  if (!ventas.length) return null;
  const [items] = await pool.query(
    `SELECT d.id, d.articulo_id, a.nombre AS articulo_nombre, d.cantidad, d.precio_unitario, d.subtotal
       FROM detalle_venta d
       JOIN articulos a ON a.id = d.articulo_id
      WHERE d.venta_id = ?
      ORDER BY d.id`,
    [id],
  );
  return { ...ventas[0], items };
}

module.exports = { normalizarItems, calcularTotales, verificarDisponibilidad, crearVenta, obtenerVenta };
