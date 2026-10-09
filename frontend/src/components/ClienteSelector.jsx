import { useCallback, useState } from 'react';
import SearchInput from './SearchInput';
import Modal from './Modal';
import ClienteForm from './ClienteForm';
import Icon from './Icon';
import { Loading, ErrorMessage } from './Feedback';
import { api, asList } from '../api/client';
import { useAsync, useDebounced } from '../utils/hooks';

/**
 * Buscar un cliente existente (GET /clientes?q=) o crearlo en línea.
 * `value` = cliente seleccionado (o null); `onChange(cliente|null)`.
 * No contiene un <form> propio fuera del modal: puede usarse junto a otros formularios.
 */
export default function ClienteSelector({ value, onChange, permitirCrear = true, opcional = false }) {
  const [q, setQ] = useState('');
  const [creando, setCreando] = useState(false);
  const qDeb = useDebounced(q.trim(), 300);

  const loader = useCallback(
    () => (qDeb ? api.get('/clientes', { q: qDeb }).then((d) => asList(d, 'clientes')) : Promise.resolve([])),
    [qDeb],
  );
  const { data, loading, error, reload } = useAsync(loader);
  const resultados = (data || []).slice(0, 8);

  if (value) {
    return (
      <div className="cliente-seleccionado">
        <div className="avatar" aria-hidden="true">{(value.nombre || '?').charAt(0).toUpperCase()}</div>
        <div>
          <strong>{value.nombre}</strong>
          <p className="texto-suave">
            {[value.documento && `Doc. ${value.documento}`, value.telefono, value.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>
          {opcional ? 'Quitar' : 'Cambiar'}
        </button>
      </div>
    );
  }

  return (
    <div className="cliente-selector">
      <div className="fila-busqueda">
        <SearchInput
          value={q}
          onChange={setQ}
          label="Buscar cliente"
          placeholder="Buscar cliente por nombre, documento o teléfono…"
        />
        {permitirCrear && (
          <button type="button" className="btn btn-secondary" onClick={() => setCreando(true)}>
            <Icon name="mas" size={18} /> Nuevo cliente
          </button>
        )}
      </div>

      {qDeb && (
        <div className="cliente-resultados" aria-live="polite">
          {loading && <Loading texto="Buscando…" />}
          {!loading && error && <ErrorMessage error={error} onRetry={reload} />}
          {!loading && !error && resultados.length === 0 && (
            <p className="texto-suave">No se encontraron clientes con “{qDeb}”.{permitirCrear && ' Puedes crearlo como nuevo cliente.'}</p>
          )}
          {!loading && !error && resultados.length > 0 && (
            <ul className="lista-opciones">
              {resultados.map((c) => (
                <li key={c.id}>
                  <button type="button" className="opcion" onClick={() => { onChange(c); setQ(''); }}>
                    <strong>{c.nombre}</strong>
                    <span className="texto-suave">
                      {[c.documento && `Doc. ${c.documento}`, c.telefono].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} titulo="Nuevo cliente">
        <ClienteForm
          cliente={null}
          onCancel={() => setCreando(false)}
          onSaved={(c) => { setCreando(false); onChange(c); setQ(''); }}
          textoGuardar="Crear y seleccionar"
        />
      </Modal>
    </div>
  );
}
