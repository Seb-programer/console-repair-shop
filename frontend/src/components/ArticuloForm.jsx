import { useState } from 'react';
import Field from './Field';
import ImageUploader from './ImageUploader';
import { ErrorMessage } from './Feedback';
import { api } from '../api/client';
import { fotoUrl } from '../utils/format';

/** Crear / editar un artículo del catálogo (multipart con `foto` opcional). */
export default function ArticuloForm({ articulo, onSaved, onCancel }) {
  const editando = Boolean(articulo?.id);
  const [form, setForm] = useState({
    nombre: articulo?.nombre ?? '',
    descripcion: articulo?.descripcion ?? '',
    categoria: articulo?.categoria ?? '',
    precio: articulo?.precio !== undefined && articulo?.precio !== null ? String(Number(articulo.precio)) : '',
    stock: articulo?.stock ?? 0,
    activo: articulo ? Boolean(Number(articulo.activo ?? 1)) : true,
  });
  const [foto, setFoto] = useState([]);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const fotoActual = !quitarFoto && !foto.length ? fotoUrl(articulo?.foto) : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!Number.isFinite(precio) || precio <= 0) return setError('El precio debe ser un número mayor que 0.');
    if (!Number.isInteger(stock) || stock < 0) return setError('El stock debe ser un número entero mayor o igual a 0.');

    const fd = new FormData();
    fd.append('nombre', form.nombre.trim());
    fd.append('descripcion', form.descripcion.trim());
    fd.append('categoria', form.categoria.trim());
    fd.append('precio', String(precio));
    fd.append('stock', String(stock));
    fd.append('activo', form.activo ? '1' : '0');
    if (foto[0]) fd.append('foto', foto[0]);
    else if (editando && quitarFoto) fd.append('quitar_foto', '1');

    setEnviando(true);
    setError(null);
    try {
      const res = editando ? await api.put(`/articulos/${articulo.id}`, fd) : await api.post('/articulos', fd);
      onSaved?.(res);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
    return undefined;
  };

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <ErrorMessage error={error} />
      <div className="grid-2">
        <Field label="Nombre" required value={form.nombre} onChange={set('nombre')} maxLength={150} />
        <Field label="Categoría" value={form.categoria} onChange={set('categoria')} maxLength={60} placeholder="Consolas, controles, juegos…" />
        <Field label="Precio" required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.precio} onChange={set('precio')} />
        <Field label="Stock" required type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={set('stock')} />
      </div>
      <Field label="Descripción" as="textarea" rows={3} value={form.descripcion} onChange={set('descripcion')} />

      {fotoActual && (
        <div className="foto-actual">
          <img src={fotoActual} alt={`Foto actual de ${articulo.nombre}`} />
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQuitarFoto(true)}>Quitar foto actual</button>
        </div>
      )}
      <ImageUploader files={foto} onChange={setFoto} max={1} multiple={false} label={fotoActual ? 'Reemplazar foto' : 'Foto'} />

      <label className="check">
        <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
        Artículo activo (visible en el catálogo y en ventas)
      </label>

      <div className="form-acciones">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={enviando}>Cancelar</button>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear artículo'}
        </button>
      </div>
    </form>
  );
}
