import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, asList } from '../api/client';
import { useAsync, useDebounced } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import ClienteForm from '../components/ClienteForm';
import Icon from '../components/Icon';
import { Alert, ListState } from '../components/Feedback';

export default function Clientes() {
  const { puede } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const qDeb = useDebounced(q.trim(), 300);
  const [editando, setEditando] = useState(null); // null | {} (nuevo) | cliente
  const [aviso, setAviso] = useState('');

  const loader = useCallback(() => api.get('/clientes', { q: qDeb }).then((d) => asList(d, 'clientes')), [qDeb]);
  const { data, loading, error, reload } = useAsync(loader);
  const clientes = data || [];
  const editable = puede('clientes.editar');

  return (
    <section>
      <PageHeader
        titulo="Clientes"
        subtitulo="Personas que traen o compran consolas"
        acciones={editable && (
          <button type="button" className="btn btn-primary" onClick={() => setEditando({})}>
            <Icon name="mas" size={18} /> Nuevo cliente
          </button>
        )}
      />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>

      <div className="barra-filtros">
        <SearchInput value={q} onChange={setQ} label="Buscar clientes" placeholder="Buscar por nombre, documento o teléfono…" />
      </div>

      <div className="card card-flush">
        <ListState
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={clientes.length === 0}
          vacioTitulo={qDeb ? 'Sin coincidencias' : 'Aún no hay clientes'}
          vacioTexto={qDeb ? `No hay clientes que coincidan con “${qDeb}”.` : 'Registra el primer cliente para comenzar.'}
        >
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Documento</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Correo</th>
                {editable && <th scope="col"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="fila-clic" onClick={() => navigate(`/panel/clientes/${c.id}`)}>
                  <td data-label="Nombre">
                    <Link to={`/panel/clientes/${c.id}`} className="link-fuerte" onClick={(e) => e.stopPropagation()}>{c.nombre}</Link>
                  </td>
                  <td data-label="Documento">{c.documento || '—'}</td>
                  <td data-label="Teléfono">{c.telefono || '—'}</td>
                  <td data-label="Correo">{c.email || '—'}</td>
                  {editable && (
                    <td className="celda-acciones">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => { e.stopPropagation(); setEditando(c); }}
                        aria-label={`Editar a ${c.nombre}`}
                      >
                        <Icon name="editar" size={16} /> Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>
      </div>

      <Modal open={editando !== null} onClose={() => setEditando(null)} titulo={editando?.id ? 'Editar cliente' : 'Nuevo cliente'}>
        {editando !== null && (
          <ClienteForm
            cliente={editando?.id ? editando : null}
            onCancel={() => setEditando(null)}
            onSaved={(c) => {
              setAviso(editando?.id ? `Cliente “${c.nombre}” actualizado.` : `Cliente “${c.nombre}” creado.`);
              setEditando(null);
              reload();
            }}
          />
        )}
      </Modal>
    </section>
  );
}
