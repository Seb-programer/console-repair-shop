import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, asList } from '../api/client';
import { useAsync, useDebounced } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EstadoBadge from '../components/EstadoBadge';
import ResultadoBadge from '../components/ResultadoBadge';
import Icon from '../components/Icon';
import { ListState } from '../components/Feedback';
import { ESTADOS, esVerdadero, formatFecha, nombreConsola } from '../utils/format';

const PESTANAS = [{ value: '', label: 'Todas' }, ...ESTADOS];

export default function Consolas() {
  const { puede } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') || '';
  const [q, setQ] = useState(params.get('q') || '');
  const qDeb = useDebounced(q.trim(), 300);

  const loader = useCallback(
    () => api.get('/consolas', { estado, q: qDeb }).then((d) => asList(d, 'consolas')),
    [estado, qDeb],
  );
  const { data, loading, error, reload } = useAsync(loader);
  const consolas = data || [];

  const cambiarEstado = (valor) => {
    const p = new URLSearchParams(params);
    if (valor) p.set('estado', valor); else p.delete('estado');
    setParams(p, { replace: true });
  };

  return (
    <section>
      <PageHeader
        titulo="Consolas"
        subtitulo="Equipos recibidos en el taller"
        acciones={puede('consolas.recibir') && (
          <Link to="/panel/recepcion" className="btn btn-primary"><Icon name="mas" size={18} /> Recibir consola</Link>
        )}
      />

      <div className="barra-filtros">
        <div className="tabs" role="tablist" aria-label="Filtrar por estado">
          {PESTANAS.map((p) => (
            <button
              key={p.value || 'todas'}
              type="button"
              role="tab"
              aria-selected={estado === p.value}
              className={`tab ${p.value ? `tab-${p.value}` : ''}`}
              onClick={() => cambiarEstado(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} label="Buscar consolas" placeholder="Buscar por marca, modelo, serie o cliente…" />
      </div>

      <div className="card card-flush" role="tabpanel">
        <ListState
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={consolas.length === 0}
          vacioTitulo="No hay consolas"
          vacioTexto={qDeb || estado ? 'Prueba con otro filtro o búsqueda.' : 'Cuando recibas una consola aparecerá aquí.'}
        >
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Consola</th>
                <th scope="col">Cliente</th>
                <th scope="col">Técnico</th>
                <th scope="col">Ingreso</th>
                <th scope="col">Estado</th>
                <th scope="col">Reparación</th>
              </tr>
            </thead>
            <tbody>
              {consolas.map((c) => (
                <tr key={c.id} className="fila-clic" onClick={() => navigate(`/panel/consolas/${c.id}`)}>
                  <td data-label="#">{c.id}</td>
                  <td data-label="Consola">
                    <Link to={`/panel/consolas/${c.id}`} onClick={(e) => e.stopPropagation()} className="link-fuerte">{nombreConsola(c)}</Link>
                    {c.numero_serie && <div className="texto-suave texto-sm">S/N {c.numero_serie}</div>}
                  </td>
                  <td data-label="Cliente">{c.cliente_nombre || '—'}</td>
                  <td data-label="Técnico">{c.tecnico_nombre || <span className="texto-suave">Sin asignar</span>}</td>
                  <td data-label="Ingreso">{formatFecha(c.fecha_ingreso, false)}</td>
                  <td data-label="Estado"><EstadoBadge estado={c.estado} /></td>
                  <td data-label="Reparación">
                    <span className="indicadores">
                      <ResultadoBadge resultado={c.resultado_reparacion} prefijo />
                      {esVerdadero(c.necesita_repuestos) && (
                        <span className="etiqueta etiqueta-repuestos" title="Necesita repuestos">
                          <Icon name="repuesto" size={12} /> Repuestos
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>
      </div>
    </section>
  );
}
