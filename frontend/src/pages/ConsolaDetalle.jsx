import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, asObject } from '../api/client';
import { useAsync } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import EstadoBadge from '../components/EstadoBadge';
import Galeria from '../components/Galeria';
import ImageUploader from '../components/ImageUploader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ConsolaCampos from '../components/ConsolaCampos';
import ReporteReparacion from '../components/ReporteReparacion';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { Alert, ErrorMessage, Loading, EmptyState } from '../components/Feedback';
import { ESTADOS, esVerdadero, estadoLabel, formatFecha, nombreConsola } from '../utils/format';
import { consolaAForm } from '../utils/consola';

function Dato({ label, children }) {
  return (
    <div className="dato">
      <dt>{label}</dt>
      <dd>{children || <span className="texto-suave">—</span>}</dd>
    </div>
  );
}

export default function ConsolaDetalle() {
  const { id } = useParams();
  const { puede } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [aviso, setAviso] = useState(location.state?.aviso || '');
  const [modal, setModal] = useState(null); // 'estado' | 'editar' | 'eliminar'

  const loader = useCallback(() => api.get(`/consolas/${id}`).then((d) => asObject(d, 'consola')), [id]);
  const { data: consola, loading, error, reload } = useAsync(loader);

  if (loading && !consola) return <Loading />;
  if (error && !consola) {
    return (
      <section>
        <PageHeader titulo="Consola" volver="/panel/consolas" />
        <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
      </section>
    );
  }
  if (!consola) return null;

  const cliente = consola.cliente || {
    id: consola.cliente_id, nombre: consola.cliente_nombre, telefono: consola.cliente_telefono,
    documento: consola.cliente_documento, email: consola.cliente_email, direccion: consola.cliente_direccion,
  };
  const procedimientos = [...(consola.procedimientos || [])].sort(
    (a, b) => new Date(a.creado_en) - new Date(b.creado_en) || a.id - b.id,
  );

  const exito = (msg) => { setAviso(msg); reload(); };

  return (
    <section>
      <PageHeader
        titulo={nombreConsola(consola)}
        subtitulo={`Consola #${consola.id} · ingresó el ${formatFecha(consola.fecha_ingreso)}`}
        volver="/panel/consolas"
        acciones={(
          <>
            <EstadoBadge estado={consola.estado} />
            {puede('consolas.estado') && (
              <button type="button" className="btn btn-secondary" onClick={() => setModal('estado')}>Cambiar estado</button>
            )}
            {puede('consolas.editar') && (
              <button type="button" className="btn btn-ghost" onClick={() => setModal('editar')}><Icon name="editar" size={16} /> Editar</button>
            )}
            {puede('registros.eliminar') && (
              <button type="button" className="btn btn-danger-ghost" onClick={() => setModal('eliminar')}><Icon name="basura" size={16} /> Eliminar</button>
            )}
          </>
        )}
      />

      <Alert tipo="exito" onClose={() => setAviso('')}>{aviso}</Alert>
      {error && <ErrorMessage error={error} onRetry={reload} />}

      <div className="grid-detalle">
        <div className="card">
          <h2 className="card-titulo">Cliente</h2>
          <dl className="datos">
            <Dato label="Nombre">{cliente.id ? <Link to={`/panel/clientes/${cliente.id}`} className="link">{cliente.nombre}</Link> : cliente.nombre}</Dato>
            <Dato label="Documento">{cliente.documento}</Dato>
            <Dato label="Teléfono">{cliente.telefono && <a href={`tel:${cliente.telefono}`} className="link">{cliente.telefono}</a>}</Dato>
            <Dato label="Correo">{cliente.email}</Dato>
            <Dato label="Dirección">{cliente.direccion}</Dato>
          </dl>
        </div>
        <div className="card">
          <h2 className="card-titulo">Equipo</h2>
          <dl className="datos">
            <Dato label="Marca / modelo">{nombreConsola(consola)}</Dato>
            <Dato label="Número de serie">{consola.numero_serie}</Dato>
            <Dato label="Color">{consola.color}</Dato>
            <Dato label="Recibido por">{consola.recibido_por_nombre}</Dato>
            <Dato label="Técnico">{consola.tecnico_nombre || 'Sin asignar'}</Dato>
            <Dato label="Finalización">{consola.fecha_finalizacion && formatFecha(consola.fecha_finalizacion)}</Dato>
          </dl>
        </div>
      </div>

      <div className="card">
        <h2 className="card-titulo">Recepción</h2>
        <dl className="datos datos-bloque">
          <Dato label="Falla reportada"><p className="pre">{consola.falla_reportada}</p></Dato>
          <Dato label="Accesorios">{consola.accesorios && <p className="pre">{consola.accesorios}</p>}</Dato>
          <Dato label="Observaciones">{consola.observaciones_recepcion && <p className="pre">{consola.observaciones_recepcion}</p>}</Dato>
        </dl>
      </div>

      <div className="card">
        <h2 className="card-titulo">Fotos de recepción</h2>
        <Galeria fotos={consola.fotos} titulo="Foto de recepción" vacioTexto="No se registraron fotos en la recepción." />
        {puede('consolas.fotos') && (
          <AgregarFotos consolaId={consola.id} onDone={() => exito('Fotos añadidas correctamente.')} />
        )}
      </div>

      <ReporteReparacion
        key={`${consola.resultado_reparacion}|${consola.necesita_repuestos}|${consola.diagnostico_resultado ?? ''}`}
        consola={consola}
        puedeEditar={puede('consolas.reparacion')}
        onCambio={exito}
      />

      <div className="card">
        <h2 className="card-titulo">Historial de procedimientos</h2>
        {procedimientos.length === 0 ? (
          <EmptyState titulo="Sin procedimientos">Aún no se ha registrado trabajo sobre esta consola.</EmptyState>
        ) : (
          <ol className="timeline">
            {procedimientos.map((p) => (
              <li key={p.id} className={`timeline-item timeline-${p.estado_resultante}`}>
                <span className="timeline-punto" aria-hidden="true" />
                <div className="timeline-contenido">
                  <div className="timeline-cabecera">
                    <strong>{p.tecnico_nombre || 'Técnico'}</strong>
                    {esVerdadero(p.interno) && (
                      <span className="etiqueta etiqueta-interno" title="El cliente no ve esta nota">
                        <Icon name="candado" size={12} /> Interno
                      </span>
                    )}
                    <time className="texto-suave" dateTime={p.creado_en}>{formatFecha(p.creado_en)}</time>
                    <EstadoBadge estado={p.estado_resultante} />
                  </div>
                  <p className="pre">{p.descripcion}</p>
                  <Galeria fotos={p.fotos} titulo="Foto del procedimiento" vacioTexto="" compacta />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {puede('consolas.procedimientos') && (
        <RegistrarProcedimiento
          key={consola.estado}
          consola={consola}
          puedeInterno={puede('consolas.interno')}
          onDone={(interno) => exito(interno ? 'Nota interna registrada (el cliente no la verá).' : 'Procedimiento registrado.')}
        />
      )}

      {modal === 'estado' && (
      <CambiarEstadoModal
        open
        consola={consola}
        onClose={() => setModal(null)}
        onDone={(e) => { setModal(null); exito(`Estado actualizado a “${estadoLabel(e)}”.`); }}
      />
      )}
      <EditarConsolaModal
        open={modal === 'editar'}
        consola={consola}
        onClose={() => setModal(null)}
        onDone={() => { setModal(null); exito('Datos de recepción actualizados.'); }}
      />
      <ConfirmDialog
        open={modal === 'eliminar'}
        onClose={() => setModal(null)}
        titulo="Eliminar consola"
        mensaje={`Se eliminará la consola #${consola.id} con todas sus fotos y procedimientos. Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        onConfirm={async () => {
          await api.del(`/consolas/${consola.id}`);
          navigate('/panel/consolas', { replace: true });
        }}
      />
    </section>
  );
}

function AgregarFotos({ consolaId, onDone }) {
  const [fotos, setFotos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  if (!abierto) {
    return (
      <div className="form-acciones form-acciones-inicio">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(true)}>
          <Icon name="camara" size={16} /> Añadir fotos
        </button>
      </div>
    );
  }

  const enviar = async (e) => {
    e.preventDefault();
    if (!fotos.length) { setError('Selecciona al menos una foto.'); return; }
    const fd = new FormData();
    fotos.forEach((f) => fd.append('fotos', f));
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/consolas/${consolaId}/fotos`, fd);
      setFotos([]);
      setAbierto(false);
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="form subform" onSubmit={enviar} noValidate>
      <ImageUploader files={fotos} onChange={setFotos} max={10} label="Nuevas fotos de recepción" />
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="button" className="btn btn-ghost" onClick={() => { setAbierto(false); setFotos([]); setError(null); }} disabled={enviando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Subiendo…' : 'Subir fotos'}</button>
      </div>
    </form>
  );
}

function RegistrarProcedimiento({ consola, puedeInterno, onDone }) {
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState(consola.estado === 'en_espera' ? 'en_proceso' : consola.estado);
  const [fotos, setFotos] = useState([]);
  const [interno, setInterno] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    if (!descripcion.trim()) { setError('Describe el procedimiento realizado.'); return; }
    const fd = new FormData();
    fd.append('descripcion', descripcion.trim());
    fd.append('estado_resultante', estado);
    fd.append('interno', puedeInterno && interno ? '1' : '0');
    fotos.forEach((f) => fd.append('fotos', f));
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/consolas/${consola.id}/procedimientos`, fd);
      setDescripcion('');
      setFotos([]);
      setInterno(false);
      onDone(interno);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card form" onSubmit={enviar} noValidate aria-labelledby="titulo-proc">
      <h2 id="titulo-proc" className="card-titulo"><Icon name="herramienta" size={18} /> Registrar procedimiento</h2>
      <Field
        label="Descripción del trabajo realizado"
        as="textarea"
        rows={4}
        required
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Diagnóstico, piezas cambiadas, pruebas realizadas…"
      />
      <Field label="Estado resultante" as="select" value={estado} onChange={(e) => setEstado(e.target.value)}>
        {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </Field>
      <ImageUploader files={fotos} onChange={setFotos} max={10} label="Fotos del procedimiento" />
      {puedeInterno && (
        <label className="check">
          <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} />
          Nota interna (el cliente no la verá)
        </label>
      )}
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar procedimiento'}</button>
      </div>
    </form>
  );
}

function CambiarEstadoModal({ open, consola, onClose, onDone }) {
  const [estado, setEstado] = useState(consola.estado);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/consolas/${consola.id}/estado`, { estado });
      onDone(estado);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} titulo="Cambiar estado" size="sm">
      <form className="form" onSubmit={enviar}>
        <fieldset className="opciones-estado">
          <legend className="form-label">Nuevo estado</legend>
          {ESTADOS.map((e) => (
            <label key={e.value} className={`opcion-estado opcion-${e.value} ${estado === e.value ? 'activa' : ''}`}>
              <input type="radio" name="estado" value={e.value} checked={estado === e.value} onChange={() => setEstado(e.value)} />
              {e.label}
            </label>
          ))}
        </fieldset>
        {estado === 'finalizado' && <p className="texto-suave texto-sm">Se registrará la fecha de finalización.</p>}
        <ErrorMessage error={error} />
        <div className="form-acciones">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando || estado === consola.estado}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditarConsolaModal({ open, consola, onClose, onDone }) {
  return (
    <Modal open={open} onClose={onClose} titulo="Editar datos de recepción" size="lg">
      {open && <EditarConsolaForm consola={consola} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function EditarConsolaForm({ consola, onClose, onDone }) {
  const [form, setForm] = useState(() => consolaAForm(consola));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || !form.falla_reportada.trim()) {
      setError('Marca, modelo y falla reportada son obligatorios.');
      return;
    }
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v ?? '').trim() || null]));
    setEnviando(true);
    setError(null);
    try {
      await api.put(`/consolas/${consola.id}`, { ...body, cliente_id: consola.cliente_id ?? consola.cliente?.id });
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <ConsolaCampos form={form} setForm={setForm} />
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}
