import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { api, asList, upload } from '../../api/client';
import { useAsync } from '../../utils/hooks';
import { esVerdadero, fotoUrl } from '../../utils/format';
import Field from '../Field';
import Icon from '../Icon';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import { Alert, ErrorMessage, ListState } from '../Feedback';

const MB = 1024 * 1024;
const TIPOS = {
  'image/jpeg': { tipo: 'foto', max: 5 * MB },
  'image/png': { tipo: 'foto', max: 5 * MB },
  'image/webp': { tipo: 'foto', max: 5 * MB },
  'video/mp4': { tipo: 'video', max: 100 * MB },
  'video/webm': { tipo: 'video', max: 100 * MB },
};

const formatTamano = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

/** Gestor de la galería de trabajos: subir (con progreso), editar, mostrar/ocultar y borrar. */
export default function GaleriaGestor() {
  const loader = useCallback(() => api.get('/galeria').then((d) => asList(d, 'galeria', 'elementos')), []);
  const { data, loading, error, reload } = useAsync(loader);
  const elementos = data || [];
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const exito = (msg) => { setAviso(msg); setErrorAccion(null); reload(); };

  const alternarVisible = async (el) => {
    const visible = !esVerdadero(el.visible);
    setCambiando(el.id);
    setErrorAccion(null);
    try {
      await api.put(`/galeria/${el.id}`, { visible: visible ? 1 : 0 });
      exito(visible ? 'El elemento ahora es visible en la página pública.' : 'El elemento quedó oculto.');
    } catch (ex) {
      setErrorAccion(ex);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className="stack">
      <SubirMedio onDone={() => exito('Archivo subido a la galería.')} siguienteOrden={elementos.length} />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>
      <ErrorMessage error={errorAccion} />

      <div className="card">
        <div className="card-header">
          <h2 className="card-titulo"><Icon name="imagen" size={18} /> Elementos de la galería</h2>
          <span className="texto-suave texto-sm">{elementos.length} en total · {elementos.filter((e) => esVerdadero(e.visible)).length} visibles</span>
        </div>
        <ListState
          loading={loading && !data}
          error={error}
          onRetry={reload}
          vacio={elementos.length === 0}
          vacioTitulo="La galería está vacía"
          vacioTexto="Sube fotos o videos de tus trabajos para mostrarlos en la página pública."
        >
          <ul className="gestor-galeria">
            {elementos.map((el) => {
              const visible = esVerdadero(el.visible);
              const url = fotoUrl(el.ruta);
              const nombre = el.titulo || `${el.tipo === 'video' ? 'Video' : 'Foto'} #${el.id}`;
              return (
                <li key={el.id} className={`gestor-item ${visible ? '' : 'gestor-item-oculto'}`}>
                  <div className="gestor-media">
                    {el.tipo === 'video'
                      ? <video src={`${url}#t=0.1`} preload="metadata" controls playsInline aria-label={nombre} />
                      : <img src={url} alt={el.titulo || ''} loading="lazy" />}
                    <span className="gestor-etiquetas">
                      <span className="etiqueta"><Icon name={el.tipo === 'video' ? 'video' : 'imagen'} size={12} /> {el.tipo === 'video' ? 'Video' : 'Foto'}</span>
                      {!visible && <span className="etiqueta etiqueta-inactivo">Oculto</span>}
                    </span>
                  </div>
                  <div className="gestor-info">
                    <strong>{nombre}</strong>
                    {el.descripcion && <p className="texto-suave texto-sm articulo-desc">{el.descripcion}</p>}
                    <span className="texto-suave texto-sm">Orden: {el.orden ?? 0}</span>
                  </div>
                  <div className="articulo-acciones">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditando(el)}>
                      <Icon name="editar" size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => alternarVisible(el)}
                      disabled={cambiando === el.id}
                      aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${nombre}`}
                    >
                      <Icon name={visible ? 'ojoOff' : 'ojo'} size={14} /> {visible ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setBorrando(el)} aria-label={`Borrar ${nombre}`}>
                      <Icon name="basura" size={14} /> Borrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </ListState>
      </div>

      <Modal open={Boolean(editando)} onClose={() => setEditando(null)} titulo="Editar elemento de la galería">
        {editando && (
          <EditarMedio
            elemento={editando}
            onClose={() => setEditando(null)}
            onDone={() => { setEditando(null); exito('Elemento actualizado.'); }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(borrando)}
        onClose={() => setBorrando(null)}
        titulo="Borrar de la galería"
        mensaje={borrando ? `Se borrará “${borrando.titulo || `elemento #${borrando.id}`}” y su archivo. Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Borrar"
        onConfirm={async () => {
          await api.del(`/galeria/${borrando.id}`);
          exito('Elemento borrado.');
        }}
      />
    </div>
  );
}

function cuerpoEdicion({ titulo, descripcion, orden, visible }) {
  return {
    titulo: String(titulo ?? '').trim() || null,
    descripcion: String(descripcion ?? '').trim() || null,
    orden: Math.max(0, Number.parseInt(orden, 10) || 0),
    visible: esVerdadero(visible) ? 1 : 0,
  };
}

function SubirMedio({ onDone, siguienteOrden }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', orden: '', visible: true });
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState(null);

  const preview = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const info = archivo ? TIPOS[archivo.type] : null;
  const subiendo = progreso !== null;

  const elegir = (lista) => {
    const f = lista?.[0];
    if (!f) return;
    const t = TIPOS[f.type];
    if (!t) { setError(`${f.name}: formato no permitido. Usa JPG, PNG, WEBP, MP4 o WEBM.`); return; }
    if (f.size > t.max) { setError(`${f.name}: supera ${t.max / MB} MB.`); return; }
    setError(null);
    setArchivo(f);
  };

  const limpiar = () => {
    setArchivo(null);
    setForm({ titulo: '', descripcion: '', orden: '', visible: true });
    setProgreso(null);
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!archivo) { setError('Selecciona una foto o un video.'); return; }
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('titulo', form.titulo.trim());
    fd.append('descripcion', form.descripcion.trim());
    fd.append('orden', String(form.orden === '' ? siguienteOrden : Math.max(0, Number.parseInt(form.orden, 10) || 0)));
    fd.append('visible', form.visible ? '1' : '0');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setProgreso(0);
    try {
      await upload('/galeria', fd, { onProgress: setProgreso, signal: ctrl.signal });
      limpiar();
      onDone();
    } catch (ex) {
      setProgreso(null);
      if (!ex.data?.cancelada) setError(ex);
      else setError('Subida cancelada.');
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <form className="card form" onSubmit={enviar} noValidate aria-labelledby={`${inputId}-titulo`}>
      <h2 id={`${inputId}-titulo`} className="card-titulo"><Icon name="mas" size={18} /> Subir foto o video</h2>
      <div className="uploader">
        <label htmlFor={inputId} className="form-label">
          Archivo <span className="texto-suave">(foto JPG, PNG o WEBP · máx. 5 MB — video MP4 o WEBM · máx. 100 MB)</span>
        </label>
        {!archivo ? (
          <div className="uploader-zona" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); elegir(e.dataTransfer.files); }}>
            <Icon name="camara" size={28} />
            <p>Arrastra un archivo aquí o</p>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => inputRef.current?.click()}>Seleccionar archivo</button>
          </div>
        ) : (
          <div className="subida-preview">
            {info?.tipo === 'video'
              ? <video src={preview} controls muted playsInline aria-label={`Vista previa de ${archivo.name}`} />
              : <img src={preview} alt={`Vista previa de ${archivo.name}`} />}
            <div className="subida-preview-info">
              <strong className="texto-cortado">{archivo.name}</strong>
              <span className="texto-suave texto-sm">{info?.tipo === 'video' ? 'Video' : 'Foto'} · {formatTamano(archivo.size)}</span>
              {!subiendo && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => inputRef.current?.click()}>Cambiar archivo</button>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={Object.keys(TIPOS).join(',')}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => { elegir(e.target.files); e.target.value = ''; }}
        />
      </div>

      <div className="grid-2">
        <Field label="Título" maxLength={150} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} disabled={subiendo} />
        <Field
          label="Orden"
          type="number"
          min="0"
          step="1"
          value={form.orden}
          onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
          placeholder={String(siguienteOrden)}
          hint="Los números menores aparecen primero."
          disabled={subiendo}
        />
      </div>
      <Field label="Descripción" as="textarea" rows={2} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} disabled={subiendo} />
      <label className="check">
        <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))} disabled={subiendo} />
        Visible en la página pública
      </label>

      {subiendo && (
        <div className="progreso-subida">
          <label htmlFor={`${inputId}-prog`} className="texto-sm">
            {progreso < 100 ? `Subiendo… ${progreso}%` : 'Procesando en el servidor…'}
          </label>
          <progress id={`${inputId}-prog`} max={100} value={progreso} />
        </div>
      )}
      <ErrorMessage error={error} />
      <div className="form-acciones">
        {subiendo ? (
          <button type="button" className="btn btn-ghost" onClick={() => abortRef.current?.abort()}>Cancelar subida</button>
        ) : (
          archivo && <button type="button" className="btn btn-ghost" onClick={limpiar}>Descartar</button>
        )}
        <button type="submit" className="btn btn-primary" disabled={subiendo || !archivo}>
          {subiendo ? 'Subiendo…' : 'Subir a la galería'}
        </button>
      </div>
    </form>
  );
}

function EditarMedio({ elemento, onClose, onDone }) {
  const [form, setForm] = useState({
    titulo: elemento.titulo || '',
    descripcion: elemento.descripcion || '',
    orden: elemento.orden ?? 0,
    visible: esVerdadero(elemento.visible),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.put(`/galeria/${elemento.id}`, cuerpoEdicion(form));
      onDone();
    } catch (ex) {
      setError(ex);
      setEnviando(false);
    }
  };

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <Field label="Título" maxLength={150} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
      <Field label="Descripción" as="textarea" rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
      <Field label="Orden" type="number" min="0" step="1" value={form.orden} onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))} hint="Los números menores aparecen primero." />
      <label className="check">
        <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))} />
        Visible en la página pública
      </label>
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}
