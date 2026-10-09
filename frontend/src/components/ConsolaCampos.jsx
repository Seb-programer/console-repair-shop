import Field from './Field';

/** Campos del formulario de recepción de consola (reutilizado en recepción y edición). */
export default function ConsolaCampos({ form, setForm }) {
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  return (
    <>
      <div className="grid-2">
        <Field label="Marca" required value={form.marca} onChange={set('marca')} placeholder="Sony, Nintendo, Microsoft…" list="marcas-consola" maxLength={60} />
        <Field label="Modelo" required value={form.modelo} onChange={set('modelo')} placeholder="PS5, Switch OLED, Xbox Series S…" maxLength={100} />
        <Field label="Número de serie" value={form.numero_serie} onChange={set('numero_serie')} maxLength={100} />
        <Field label="Color" value={form.color} onChange={set('color')} maxLength={40} />
      </div>
      <datalist id="marcas-consola">
        <option value="Sony" />
        <option value="Nintendo" />
        <option value="Microsoft" />
        <option value="Sega" />
        <option value="Valve" />
      </datalist>
      <Field label="Accesorios entregados" as="textarea" rows={2} value={form.accesorios} onChange={set('accesorios')} placeholder="Control, cable HDMI, cargador…" />
      <Field label="Falla reportada" required as="textarea" rows={3} value={form.falla_reportada} onChange={set('falla_reportada')} placeholder="Describe la falla que indica el cliente" />
      <Field label="Observaciones de recepción" as="textarea" rows={2} value={form.observaciones_recepcion} onChange={set('observaciones_recepcion')} placeholder="Rayones, golpes, piezas faltantes…" />
    </>
  );
}
