import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, asObject } from '../api/client';
import { useAsync } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import EstadoBadge from '../components/EstadoBadge';
import Modal from '../components/Modal';
import ClienteForm from '../components/ClienteForm';
import Icon from '../components/Icon';
import { Alert, ErrorMessage, ListState, Loading } from '../components/Feedback';
import { formatFecha, nombreConsola } from '../utils/format';

export default function ClienteDetalle() {
  const { id } = useParams();
  const { puede } = useAuth();
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState('');

  const loader = useCallback(() => api.get(`/clientes/${id}`).then((d) => asObject(d, 'cliente')), [id]);
  const { data: cliente, loading, error, reload } = useAsync(loader);

  if (loading && !cliente) return <Loading />;
  if (error && !cliente) {
    return (
      <section>
        <PageHeader titulo="Cliente" volver="/panel/clientes" />
        <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
      </section>
    );
  }
  if (!cliente) return null;
  const consolas = cliente.consolas || [];

  return (
    <section>
      <PageHeader
        titulo={cliente.nombre}
        subtitulo={`Cliente #${cliente.id}${cliente.creado_en ? ` · desde ${formatFecha(cliente.creado_en, false)}` : ''}`}
        volver="/panel/clientes"
        acciones={puede('clientes.editar') && (
          <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)}>
            <Icon name="editar" size={16} /> Editar
          </button>
        )}
      />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>

      <div className="card">
        <h2 className="card-titulo">Datos de contacto</h2>
        <dl className="datos">
          <div className="dato"><dt>Documento</dt><dd>{cliente.documento || '—'}</dd></div>
          <div className="dato"><dt>Teléfono</dt><dd>{cliente.telefono ? <a className="link" href={`tel:${cliente.telefono}`}>{cliente.telefono}</a> : '—'}</dd></div>
          <div className="dato"><dt>Correo</dt><dd>{cliente.email ? <a className="link" href={`mailto:${cliente.email}`}>{cliente.email}</a> : '—'}</dd></div>
          <div className="dato"><dt>Dirección</dt><dd>{cliente.direccion || '—'}</dd></div>
        </dl>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h2>Consolas ({consolas.length})</h2>
          {puede('consolas.recibir') && <Link to="/panel/recepcion" className="link">Recibir consola</Link>}
        </div>
        <ListState vacio={consolas.length === 0} vacioTitulo="Este cliente no tiene consolas registradas">
          <ul className="lista-filas">
            {consolas.map((c) => (
              <li key={c.id}>
                <Link to={`/panel/consolas/${c.id}`} className="fila-link">
                  <div>
                    <strong>{nombreConsola(c)}</strong>
                    <p className="texto-suave">
                      #{c.id} · {formatFecha(c.fecha_ingreso, false)}
                      {c.tecnico_nombre ? ` · Técnico: ${c.tecnico_nombre}` : ''}
                    </p>
                  </div>
                  <EstadoBadge estado={c.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </ListState>
      </div>

      <Modal open={editando} onClose={() => setEditando(false)} titulo="Editar cliente">
        {editando && (
          <ClienteForm
            cliente={cliente}
            onCancel={() => setEditando(false)}
            onSaved={() => { setEditando(false); setAviso('Datos del cliente actualizados.'); reload(); }}
          />
        )}
      </Modal>
    </section>
  );
}
