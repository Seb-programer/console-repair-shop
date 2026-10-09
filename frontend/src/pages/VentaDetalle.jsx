import { useCallback, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, asObject } from '../api/client';
import { useAsync } from '../utils/hooks';
import PageHeader from '../components/PageHeader';
import { Alert, ErrorMessage, ListState, Loading } from '../components/Feedback';
import { formatFecha, formatMoneda } from '../utils/format';

export default function VentaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const [aviso, setAviso] = useState(location.state?.aviso || '');
  const loader = useCallback(() => api.get(`/ventas/${id}`).then((d) => asObject(d, 'venta')), [id]);
  const { data: venta, loading, error, reload } = useAsync(loader);

  if (loading && !venta) return <Loading />;
  if (error && !venta) {
    return (
      <section>
        <PageHeader titulo="Venta" volver="/panel/ventas" />
        <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
      </section>
    );
  }
  if (!venta) return null;
  const items = venta.items || venta.detalle || [];

  return (
    <section>
      <PageHeader titulo={`Venta #${venta.id}`} subtitulo={formatFecha(venta.fecha)} volver="/panel/ventas" />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>

      <div className="card">
        <dl className="datos">
          <div className="dato">
            <dt>Cliente</dt>
            <dd>{venta.cliente_id
              ? <Link to={`/panel/clientes/${venta.cliente_id}`} className="link">{venta.cliente_nombre || `Cliente #${venta.cliente_id}`}</Link>
              : 'Venta de mostrador'}</dd>
          </div>
          {venta.cliente_documento && <div className="dato"><dt>Documento</dt><dd>{venta.cliente_documento}</dd></div>}
          <div className="dato"><dt>Vendedor</dt><dd>{venta.usuario_nombre || '—'}</dd></div>
          <div className="dato"><dt>Fecha</dt><dd>{formatFecha(venta.fecha)}</dd></div>
        </dl>
      </div>

      <div className="card card-flush">
        <ListState vacio={items.length === 0} vacioTitulo="La venta no tiene artículos">
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">Artículo</th>
                <th scope="col" className="num">Cantidad</th>
                <th scope="col" className="num">Precio unitario</th>
                <th scope="col" className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id ?? it.articulo_id}>
                  <td data-label="Artículo">{it.articulo_nombre || it.nombre || `Artículo #${it.articulo_id}`}</td>
                  <td data-label="Cantidad" className="num">{it.cantidad}</td>
                  <td data-label="Precio unitario" className="num">{formatMoneda(it.precio_unitario)}</td>
                  <td data-label="Subtotal" className="num">{formatMoneda(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="num">Total</th>
                <td className="num total-celda" data-label="Total">{formatMoneda(venta.total)}</td>
              </tr>
            </tfoot>
          </table>
        </ListState>
      </div>
    </section>
  );
}
