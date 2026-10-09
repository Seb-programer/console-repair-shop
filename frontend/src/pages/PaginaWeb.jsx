import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, asObject } from '../api/client';
import { useAsync } from '../utils/hooks';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import NegocioForm from '../components/web/NegocioForm';
import GaleriaGestor from '../components/web/GaleriaGestor';
import { Alert, ErrorMessage, Loading } from '../components/Feedback';

const PESTANAS = [
  { value: 'negocio', label: 'Información del negocio' },
  { value: 'galeria', label: 'Galería de trabajos' },
];

/** Administración de la página pública (solo administrador). */
export default function PaginaWeb() {
  const [params, setParams] = useSearchParams();
  const pestana = params.get('tab') === 'galeria' ? 'galeria' : 'negocio';

  return (
    <section>
      <PageHeader
        titulo="Página web"
        subtitulo="Información y galería que ven los clientes en la página pública"
        acciones={(
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <Icon name="externo" size={16} /> Ver página pública<span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        )}
      />
      <div className="tabs" role="tablist" aria-label="Secciones de la página web">
        {PESTANAS.map((p) => (
          <button
            key={p.value}
            id={`tab-${p.value}`}
            type="button"
            role="tab"
            aria-selected={pestana === p.value}
            aria-controls={`panel-${p.value}`}
            className="tab"
            onClick={() => setParams(p.value === 'negocio' ? {} : { tab: p.value }, { replace: true })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`tab-${pestana}`}>
        {pestana === 'negocio' ? <InfoNegocio /> : <GaleriaGestor />}
      </div>
    </section>
  );
}

function InfoNegocio() {
  const loader = useCallback(() => api.get('/negocio').then((d) => asObject(d, 'negocio')), []);
  const { data: negocio, loading, error, reload } = useAsync(loader);
  const [aviso, setAviso] = useState('');

  if (loading && !negocio) return <Loading />;
  if (error && !negocio) return <ErrorMessage error={error} onRetry={reload} />;

  return (
    <div className="card">
      <h2 className="card-titulo"><Icon name="web" size={18} /> Información del negocio</h2>
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>
      <NegocioForm
        key={negocio?.actualizado_en || 'negocio'}
        negocio={negocio}
        onSaved={() => { setAviso('Información guardada. Ya se ve en la página pública.'); reload(); }}
      />
    </div>
  );
}
