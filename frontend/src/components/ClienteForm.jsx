import { useState } from 'react';
import Field from './Field';
import { ErrorMessage } from './Feedback';
import { api, asObject } from '../api/client';

const VACIO = { nombre: '', documento: '', telefono: '', email: '', direccion: '' };

/**
 * Formulario para crear o editar un cliente.
 * Llama a POST /clientes o PUT /clientes/:id y devuelve el cliente guardado en `onSaved`.
 */
export default function ClienteForm({ cliente, onSaved, onCancel, textoGuardar }) {
  const editando = Boolean(cliente?.id);
  const [form, setForm] = useState(() => ({
    ...VACIO,
    ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, cliente?.[k] ?? ''])),
  }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setEnviando(true);
    setError(null);
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()]));
    try {
      const res = editando
        ? await api.put(`/clientes/${cliente.id}`, body)
        : await api.post('/clientes', body);
      const guardado = asObject(res, 'cliente');
      const resultado = { ...(cliente || {}), ...body, ...(guardado && typeof guardado === 'object' ? guardado : {}) };
      if (!resultado.id) resultado.id = res?.id ?? res?.insertId ?? cliente?.id;
      onSaved?.(resultado);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form" noValidate>
      <ErrorMessage error={error} />
      <div className="grid-2">
        <Field label="Nombre" required value={form.nombre} onChange={set('nombre')} autoComplete="name" />
        <Field label="Documento" value={form.documento} onChange={set('documento')} hint="Opcional, único por cliente" />
        <Field label="Teléfono" type="tel" value={form.telefono} onChange={set('telefono')} autoComplete="tel" />
        <Field label="Correo electrónico" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
      </div>
      <Field label="Dirección" value={form.direccion} onChange={set('direccion')} autoComplete="street-address" />
      <div className="form-acciones">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={enviando}>Cancelar</button>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Guardando…' : textoGuardar || (editando ? 'Guardar cambios' : 'Crear cliente')}
        </button>
      </div>
    </form>
  );
}
