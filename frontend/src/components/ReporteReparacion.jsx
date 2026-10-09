import { useId, useState } from 'react';
import { api } from '../api/client';
import Field from './Field';
import Icon from './Icon';
import ResultadoBadge from './ResultadoBadge';
import ConfirmDialog from './ConfirmDialog';
import { EmptyState, ErrorMessage } from './Feedback';
import { ESTADOS_REPUESTO, RESULTADOS, esVerdadero, estadoRepuestoLabel, formatMoneda } from '../utils/format';

/**
 * Reporte de reparación de una consola: resultado, explicación, "necesita repuestos" y lista de repuestos.
 * `puedeEditar` (técnico/admin); el resto de roles lo ve en solo lectura.
 */
export default function ReporteReparacion({ consola, puedeEditar, onCambio }) {
  const repuestos = consola.repuestos || [];
  return (
    <div className="card" aria-labelledby="titulo-reporte">
      <div className="card-header">
        <h2 id="titulo-reporte" className="card-titulo"><Icon name="escudo" size={18} /> Reporte de reparación</h2>
        <ResultadoBadge resultado={consola.resultado_reparacion} prefijo />
      </div>
      {puedeEditar
        ? <FormReporte consola={consola} onDone={() => onCambio('Reporte de reparación guardado.')} />
        : <VistaReporte consola={consola} />}
      <Repuestos consola={consola} repuestos={repuestos} puedeEditar={puedeEditar} onCambio={onCambio} />
    </div>
  );
}

function VistaReporte({ consola }) {
  return (
    <dl className="datos datos-bloque">
      <div className="dato">
        <dt>Explicación del técnico</dt>
        <dd>{consola.diagnostico_resultado ? <p className="pre">{consola.diagnostico_resultado}</p> : <span className="texto-suave">Sin explicación registrada.</span>}</dd>
      </div>
      <div className="dato">
        <dt>Necesita repuestos</dt>
        <dd>{esVerdadero(consola.necesita_repuestos) ? 'Sí' : 'No'}</dd>
      </div>
    </dl>
  );
}

function FormReporte({ consola, onDone }) {
  const switchId = useId();
  const inicial = {
    resultado_reparacion: consola.resultado_reparacion || 'pendiente',
    diagnostico_resultado: consola.diagnostico_resultado || '',
    necesita_repuestos: esVerdadero(consola.necesita_repuestos),
  };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cambiado = form.resultado_reparacion !== inicial.resultado_reparacion
    || form.diagnostico_resultado.trim() !== inicial.diagnostico_resultado.trim()
    || form.necesita_repuestos !== inicial.necesita_repuestos;

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.put(`/consolas/${consola.id}/reparacion`, {
        resultado_reparacion: form.resultado_reparacion,
        diagnostico_resultado: form.diagnostico_resultado.trim() || null,
        necesita_repuestos: form.necesita_repuestos,
      });
      onDone();
    } catch (ex) {
      setError(ex);
      setEnviando(false);
    }
  };

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <fieldset className="opciones-estado opciones-resultado">
        <legend className="form-label">Resultado</legend>
        {RESULTADOS.map((r) => (
          <label key={r.value} className={`opcion-estado opcion-res-${r.value} ${form.resultado_reparacion === r.value ? 'activa' : ''}`}>
            <input
              type="radio"
              name={`resultado-${consola.id}`}
              value={r.value}
              checked={form.resultado_reparacion === r.value}
              onChange={() => setForm((f) => ({ ...f, resultado_reparacion: r.value }))}
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <Field
        label="Explicación (la verá el cliente)"
        as="textarea"
        rows={3}
        value={form.diagnostico_resultado}
        onChange={(e) => setForm((f) => ({ ...f, diagnostico_resultado: e.target.value }))}
        placeholder="Qué se encontró, qué se hizo o por qué no se pudo reparar…"
      />
      <label htmlFor={switchId} className="switch">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          checked={form.necesita_repuestos}
          onChange={(e) => setForm((f) => ({ ...f, necesita_repuestos: e.target.checked }))}
        />
        <span className="switch-pista" aria-hidden="true" />
        Necesita repuestos
      </label>
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="submit" className="btn btn-primary" disabled={enviando || !cambiado}>{enviando ? 'Guardando…' : 'Guardar reporte'}</button>
      </div>
    </form>
  );
}

const REPUESTO_VACIO = { nombre: '', cantidad: '1', costo_estimado: '', estado: 'pendiente', notas: '' };

function cuerpoRepuesto(r) {
  const costo = String(r.costo_estimado ?? '').trim();
  return {
    nombre: String(r.nombre).trim(),
    cantidad: Number.parseInt(r.cantidad, 10),
    costo_estimado: costo === '' ? null : Number(costo),
    estado: r.estado || 'pendiente',
    notas: String(r.notas ?? '').trim() || null,
  };
}

function Repuestos({ consola, repuestos, puedeEditar, onCambio }) {
  const [agregando, setAgregando] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [error, setError] = useState(null);

  const cambiarEstado = async (r, estado) => {
    setCambiando(r.id);
    setError(null);
    try {
      await api.put(`/consolas/${consola.id}/repuestos/${r.id}`, { estado });
      onCambio(`Repuesto “${r.nombre}” marcado como ${estadoRepuestoLabel(estado).toLowerCase()}.`);
    } catch (ex) {
      setError(ex);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <section className="subform" aria-labelledby="titulo-repuestos">
      <div className="card-header">
        <h3 id="titulo-repuestos" className="card-titulo subtitulo"><Icon name="repuesto" size={16} /> Repuestos</h3>
        {puedeEditar && !agregando && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAgregando(true)}>
            <Icon name="mas" size={14} /> Añadir repuesto
          </button>
        )}
      </div>
      <ErrorMessage error={error} />
      {repuestos.length === 0 ? (
        !agregando && <EmptyState titulo="Sin repuestos">{esVerdadero(consola.necesita_repuestos) ? 'Marcada como “necesita repuestos”, pero aún no se ha añadido ninguno.' : 'No se han registrado repuestos para esta consola.'}</EmptyState>
      ) : (
        <div className="card card-flush">
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">Repuesto</th>
                <th scope="col" className="num">Cant.</th>
                <th scope="col" className="num">Costo estimado</th>
                <th scope="col">Estado</th>
                {puedeEditar && <th scope="col"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {repuestos.map((r) => (
                <tr key={r.id}>
                  <td data-label="Repuesto">
                    <strong>{r.nombre}</strong>
                    {r.notas && <div className="texto-suave texto-sm pre">{r.notas}</div>}
                  </td>
                  <td data-label="Cantidad" className="num">{r.cantidad}</td>
                  <td data-label="Costo estimado" className="num">{r.costo_estimado != null ? formatMoneda(r.costo_estimado) : <span className="texto-suave">—</span>}</td>
                  <td data-label="Estado">
                    {puedeEditar ? (
                      <select
                        className="input select input-sm"
                        value={r.estado}
                        onChange={(e) => cambiarEstado(r, e.target.value)}
                        disabled={cambiando === r.id}
                        aria-label={`Estado de ${r.nombre}`}
                      >
                        {ESTADOS_REPUESTO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    ) : (
                      <span className={`etiqueta-repuesto etiqueta-repuesto-${r.estado}`}>{estadoRepuestoLabel(r.estado)}</span>
                    )}
                  </td>
                  {puedeEditar && (
                    <td className="celda-acciones">
                      <button type="button" className="btn-icon btn-icon-peligro" onClick={() => setBorrando(r)} aria-label={`Borrar repuesto ${r.nombre}`} title="Borrar">
                        <Icon name="basura" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {agregando && (
        <NuevoRepuesto
          consolaId={consola.id}
          onCancel={() => setAgregando(false)}
          onDone={(nombre) => { setAgregando(false); onCambio(`Repuesto “${nombre}” añadido.`); }}
        />
      )}
      <ConfirmDialog
        open={Boolean(borrando)}
        onClose={() => setBorrando(null)}
        titulo="Borrar repuesto"
        mensaje={borrando ? `¿Borrar “${borrando.nombre}” de la lista de repuestos?` : ''}
        textoConfirmar="Borrar"
        onConfirm={async () => {
          await api.del(`/consolas/${consola.id}/repuestos/${borrando.id}`);
          onCambio('Repuesto borrado.');
        }}
      />
    </section>
  );
}

function NuevoRepuesto({ consolaId, onCancel, onDone }) {
  const [form, setForm] = useState(REPUESTO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const body = cuerpoRepuesto(form);
    if (!body.nombre) { setError('Escribe el nombre del repuesto.'); return; }
    if (!Number.isInteger(body.cantidad) || body.cantidad < 1) { setError('La cantidad debe ser un número entero mayor que 0.'); return; }
    if (body.costo_estimado !== null && (!Number.isFinite(body.costo_estimado) || body.costo_estimado < 0)) {
      setError('El costo estimado debe ser un número mayor o igual a 0.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/consolas/${consolaId}/repuestos`, body);
      onDone(body.nombre);
    } catch (ex) {
      setError(ex);
      setEnviando(false);
    }
  };

  return (
    <form className="form subform" onSubmit={enviar} noValidate aria-label="Nuevo repuesto">
      <div className="grid-2">
        <Field label="Repuesto" required maxLength={150} value={form.nombre} onChange={set('nombre')} placeholder="Ej. Lector Blu-ray, ventilador…" autoFocus />
        <Field label="Estado" as="select" value={form.estado} onChange={set('estado')}>
          {ESTADOS_REPUESTO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </Field>
        <Field label="Cantidad" type="number" min="1" step="1" required value={form.cantidad} onChange={set('cantidad')} />
        <Field label="Costo estimado (COP)" type="number" min="0" step="any" value={form.costo_estimado} onChange={set('costo_estimado')} hint="Opcional. El cliente lo verá en la consulta." />
      </div>
      <Field label="Notas" as="textarea" rows={2} value={form.notas} onChange={set('notas')} />
      <p className="texto-suave texto-sm">Al añadir un repuesto la consola queda marcada como “necesita repuestos”.</p>
      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={enviando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Añadir repuesto'}</button>
      </div>
    </form>
  );
}
