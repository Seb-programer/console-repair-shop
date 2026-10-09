import { useCallback, useState } from 'react';
import { api, asList } from '../api/client';
import { useAsync, useDebounced } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ArticuloForm from '../components/ArticuloForm';
import Icon from '../components/Icon';
import { Alert, ListState } from '../components/Feedback';
import { formatMoneda, fotoUrl } from '../utils/format';

export default function Catalogo() {
  const { puede } = useAuth();
  const esAdmin = puede('articulos.editar');
  const [q, setQ] = useState('');
  const qDeb = useDebounced(q.trim(), 300);
  const [verInactivos, setVerInactivos] = useState(false);
  const [editando, setEditando] = useState(null);
  const [desactivando, setDesactivando] = useState(null);
  const [aviso, setAviso] = useState('');

  const loader = useCallback(
    () => api.get('/articulos', { q: qDeb, todos: esAdmin && verInactivos ? 1 : undefined }).then((d) => asList(d, 'articulos')),
    [qDeb, esAdmin, verInactivos],
  );
  const { data, loading, error, reload } = useAsync(loader);
  const articulos = data || [];

  return (
    <section>
      <PageHeader
        titulo="Catálogo"
        subtitulo="Consolas, accesorios y repuestos a la venta"
        acciones={esAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setEditando({})}>
            <Icon name="mas" size={18} /> Nuevo artículo
          </button>
        )}
      />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>

      <div className="barra-filtros">
        <SearchInput value={q} onChange={setQ} label="Buscar artículos" placeholder="Buscar por nombre, categoría o descripción…" />
        {esAdmin && (
          <label className="check">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
            Mostrar inactivos
          </label>
        )}
      </div>

      <ListState
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={articulos.length === 0}
        vacioTitulo={qDeb ? 'Sin coincidencias' : 'El catálogo está vacío'}
        vacioTexto={qDeb ? `No hay artículos que coincidan con “${qDeb}”.` : esAdmin ? 'Crea el primer artículo.' : ''}
      >
        <ul className="grid-articulos">
          {articulos.map((a) => {
            const activo = Boolean(Number(a.activo ?? 1));
            const stock = Number(a.stock);
            const foto = fotoUrl(a.foto);
            return (
              <li key={a.id} className={`articulo ${activo ? '' : 'articulo-inactivo'}`}>
                <div className="articulo-foto">
                  {foto ? <img src={foto} alt={a.nombre} loading="lazy" /> : <Icon name="imagen" size={40} />}
                  {!activo && <span className="etiqueta etiqueta-inactivo">Inactivo</span>}
                </div>
                <div className="articulo-cuerpo">
                  {a.categoria && <span className="articulo-categoria">{a.categoria}</span>}
                  <h2 className="articulo-nombre">{a.nombre}</h2>
                  {a.descripcion && <p className="articulo-desc texto-suave">{a.descripcion}</p>}
                  <div className="articulo-pie">
                    <span className="articulo-precio">{formatMoneda(a.precio)}</span>
                    <span className={`stock ${stock === 0 ? 'stock-agotado' : stock <= 3 ? 'stock-bajo' : ''}`}>
                      {stock === 0 ? 'Agotado' : `${stock} en stock`}
                    </span>
                  </div>
                  {esAdmin && (
                    <div className="articulo-acciones">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditando(a)} aria-label={`Editar ${a.nombre}`}>
                        <Icon name="editar" size={16} /> Editar
                      </button>
                      {activo && (
                        <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setDesactivando(a)} aria-label={`Desactivar ${a.nombre}`}>
                          <Icon name="basura" size={16} /> Desactivar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </ListState>

      <Modal open={editando !== null} onClose={() => setEditando(null)} titulo={editando?.id ? 'Editar artículo' : 'Nuevo artículo'} size="lg">
        {editando !== null && (
          <ArticuloForm
            articulo={editando?.id ? editando : null}
            onCancel={() => setEditando(null)}
            onSaved={() => {
              setAviso(editando?.id ? 'Artículo actualizado.' : 'Artículo creado.');
              setEditando(null);
              reload();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={desactivando !== null}
        onClose={() => setDesactivando(null)}
        titulo="Desactivar artículo"
        mensaje={`“${desactivando?.nombre}” dejará de aparecer en el catálogo y en las ventas. Podrás reactivarlo editándolo.`}
        textoConfirmar="Desactivar"
        onConfirm={async () => {
          await api.del(`/articulos/${desactivando.id}`);
          setAviso('Artículo desactivado.');
          reload();
        }}
      />
    </section>
  );
}
