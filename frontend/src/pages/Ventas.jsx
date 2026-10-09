import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, asList } from '../api/client';
import { useAsync } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { ListState } from '../components/Feedback';
import { formatFecha, formatMoneda } from '../utils/format';

export default function Ventas() {
  const { puede } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => api.get('/ventas').then((d) => asList(d, 'ventas')), []);
  const { data, loading, error, reload } = useAsync(loader);
  const ventas = data || [];

  return (
    <section>
      <PageHeader
        titulo="Ventas"
        subtitulo="Historial de ventas del catálogo"
        acciones={puede('ventas.crear') && (
          <Link to="/panel/ventas/nueva" className="btn btn-primary"><Icon name="carrito" size={18} /> Nueva venta</Link>
        )}
      />
      <div className="card card-flush">
        <ListState
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={ventas.length === 0}
          vacioTitulo="Aún no hay ventas"
          vacioTexto="Las ventas registradas aparecerán aquí."
        >
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Vendedor</th>
                <th scope="col" className="num">Artículos</th>
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="fila-clic" onClick={() => navigate(`/panel/ventas/${v.id}`)}>
                  <td data-label="#"><Link to={`/panel/ventas/${v.id}`} className="link-fuerte" onClick={(e) => e.stopPropagation()}>{v.id}</Link></td>
                  <td data-label="Fecha">{formatFecha(v.fecha)}</td>
                  <td data-label="Cliente">{v.cliente_nombre || <span className="texto-suave">Mostrador</span>}</td>
                  <td data-label="Vendedor">{v.usuario_nombre || '—'}</td>
                  <td data-label="Artículos" className="num">{v.cantidad_articulos ?? '—'}</td>
                  <td data-label="Total" className="num"><strong>{formatMoneda(v.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>
      </div>
    </section>
  );
}
