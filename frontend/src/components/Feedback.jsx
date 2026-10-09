import Icon from './Icon';

export function Loading({ texto = 'Cargando…' }) {
  return (
    <div className="estado-vista" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Ocurrió un error inesperado.';
  return (
    <div className="alerta alerta-error" role="alert">
      <Icon name="alerta" />
      <span>{msg}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Reintentar</button>
      )}
    </div>
  );
}

export function Alert({ tipo = 'exito', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icon name={tipo === 'error' ? 'alerta' : 'check'} />
      <span>{children}</span>
      {onClose && (
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar aviso">
          <Icon name="cerrar" size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ titulo = 'Sin resultados', children }) {
  return (
    <div className="vacio">
      <Icon name="vacio" size={36} />
      <p className="vacio-titulo">{titulo}</p>
      {children && <div className="texto-suave">{children}</div>}
    </div>
  );
}

/** Combina carga / error / vacío para una lista. */
export function ListState({ loading, error, onRetry, vacio, vacioTitulo, vacioTexto, children }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={onRetry} />;
  if (vacio) return <EmptyState titulo={vacioTitulo}>{vacioTexto}</EmptyState>;
  return children;
}
