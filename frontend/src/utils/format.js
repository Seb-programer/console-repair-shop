export const ESTADOS = [
  { value: 'en_espera', label: 'En espera' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizado', label: 'Finalizado' },
];

export function estadoLabel(estado) {
  return ESTADOS.find((e) => e.value === estado)?.label || estado || '—';
}

export const RESULTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'reparada', label: 'Reparada' },
  { value: 'no_reparable', label: 'No reparable' },
];

export function resultadoLabel(resultado) {
  return RESULTADOS.find((r) => r.value === resultado)?.label || 'Pendiente';
}

export const ESTADOS_REPUESTO = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pedido', label: 'Pedido' },
  { value: 'conseguido', label: 'Conseguido' },
];

export function estadoRepuestoLabel(estado) {
  return ESTADOS_REPUESTO.find((e) => e.value === estado)?.label || estado || '—';
}

/** Interpreta 1/0, '1'/'0', true/false. */
export function esVerdadero(valor) {
  return valor === true || valor === 1 || valor === '1' || valor === 'true';
}

/** Enlace de WhatsApp (wa.me) con mensaje opcional; null si no hay número. */
export function enlaceWhatsApp(numero, mensaje) {
  const digitos = String(numero || '').replace(/\D/g, '');
  if (!digitos) return null;
  return `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function formatMoneda(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? moneda.format(n) : '—';
}

export function formatFecha(valor, conHora = true) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString('es-CO', conHora
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
}

/** Devuelve la URL usable de una foto (string, o objeto con ruta/url). */
export function fotoUrl(foto) {
  if (!foto) return null;
  const ruta = typeof foto === 'string' ? foto : foto.ruta || foto.url || foto.foto;
  if (!ruta) return null;
  if (/^(https?:|blob:|data:)/.test(ruta)) return ruta;
  return ruta.startsWith('/') ? ruta : `/${ruta}`;
}

export function nombreConsola(c) {
  return [c?.marca, c?.modelo].filter(Boolean).join(' ') || `Consola #${c?.id ?? ''}`;
}
