import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import EstadoBadge from '../components/EstadoBadge';
import Icon from '../components/Icon';
import { ListState, Loading, ErrorMessage } from '../components/Feedback';
import { ESTADOS, formatFecha, formatMoneda, nombreConsola } from '../utils/format';

const primero = (obj, claves) => claves.map((k) => obj?.[k]).find((v) => v !== undefined && v !== null);

/** Normaliza la respuesta de GET /dashboard admitiendo variantes de nombres. */
function normalizar(d = {}) {
  const fuente = primero(d, ['conteo', 'conteos', 'por_estado', 'porEstado', 'estados', 'consolas_por_estado', 'consolas']) ?? d;
  const conteo = { en_espera: 0, en_proceso: 0, finalizado: 0 };
  if (Array.isArray(fuente)) {
    fuente.forEach((f) => { if (f?.estado in conteo) conteo[f.estado] = Number(f.total ?? f.cantidad ?? f.count ?? 0); });
  } else if (fuente && typeof fuente === 'object') {
    Object.keys(conteo).forEach((k) => { if (fuente[k] !== undefined) conteo[k] = Number(fuente[k]) || 0; });
  }
  const ultimas = primero(d, ['ultimas_consolas', 'ultimasConsolas', 'ultimas']) || [];
  const v = primero(d, ['ventas_hoy', 'ventas_dia', 'ventas_del_dia', 'ventasHoy', 'ventasDelDia', 'ventas']);
  let ventas = { cantidad: 0, total: 0 };
  if (typeof v === 'number') ventas = { cantidad: v, total: null };
  else if (Array.isArray(v)) ventas = { cantidad: v.length, total: v.reduce((s, x) => s + Number(x.total || 0), 0) };
  else if (v && typeof v === 'object') {
    ventas = {
      cantidad: Number(primero(v, ['cantidad', 'count', 'numero', 'total_ventas']) ?? 0),
      total: Number(primero(v, ['total', 'monto', 'suma', 'total_vendido']) ?? 0),
    };
  }
  return { conteo, ultimas: Array.isArray(ultimas) ? ultimas : [], ventas };
}

export default function Panel() {
  const { usuario, puede } = useAuth();
  const loader = useCallback(() => api.get('/dashboard'), []);
  const { data, loading, error, reload } = useAsync(loader);

  if (loading && !data) return <Loading />;
  const { conteo, ultimas, ventas } = normalizar(data || {});

  return (
    <section>
      <PageHeader
        titulo={`Hola, ${usuario?.nombre?.split(' ')[0] || ''}`}
        subtitulo="Resumen del taller"
        acciones={puede('consolas.recibir') && (
          <Link to="/panel/recepcion" className="btn btn-primary"><Icon name="recepcion" size={18} /> Recibir consola</Link>
        )}
      />
      <ErrorMessage error={error} onRetry={reload} />

      <div className="tarjetas-estado">
        {ESTADOS.map((e) => (
          <Link key={e.value} to={`/panel/consolas?estado=${e.value}`} className={`tarjeta-estado tarjeta-${e.value}`}>
            <span className="tarjeta-estado-label">{e.label}</span>
            <span className="tarjeta-estado-num">{conteo[e.value]}</span>
            <span className="texto-suave">consolas</span>
          </Link>
        ))}
        {puede('ventas.ver') && (
          <Link to="/panel/ventas" className="tarjeta-estado tarjeta-ventas">
            <span className="tarjeta-estado-label">Ventas de hoy</span>
            <span className="tarjeta-estado-num">{ventas.total !== null ? formatMoneda(ventas.total) : ventas.cantidad}</span>
            <span className="texto-suave">{ventas.cantidad} venta{ventas.cantidad === 1 ? '' : 's'}</span>
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Últimas consolas</h2>
          <Link to="/panel/consolas" className="link">Ver todas</Link>
        </div>
        <ListState
          loading={false}
          error={null}
          vacio={ultimas.length === 0}
          vacioTitulo="Aún no hay consolas registradas"
        >
          <ul className="lista-filas">
            {ultimas.map((c) => (
              <li key={c.id}>
                <Link to={`/panel/consolas/${c.id}`} className="fila-link">
                  <div>
                    <strong>{nombreConsola(c)}</strong>
                    <p className="texto-suave">
                      {c.cliente_nombre || c.cliente?.nombre || 'Cliente'} · {formatFecha(c.fecha_ingreso)}
                    </p>
                  </div>
                  <EstadoBadge estado={c.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </ListState>
      </div>
    </section>
  );
}
