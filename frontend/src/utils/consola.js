export const CONSOLA_VACIA = {
  marca: '', modelo: '', numero_serie: '', color: '',
  accesorios: '', falla_reportada: '', observaciones_recepcion: '',
};

export const CAMPOS_CONSOLA = Object.keys(CONSOLA_VACIA);

export function consolaAFormData(form) {
  const fd = new FormData();
  CAMPOS_CONSOLA.forEach((k) => fd.append(k, (form[k] ?? '').trim()));
  return fd;
}

export function consolaAForm(consola) {
  return Object.fromEntries(CAMPOS_CONSOLA.map((k) => [k, consola?.[k] ?? '']));
}
