import { resultadoLabel } from '../utils/format';

/** Resultado de la reparación: Pendiente / Reparada / No reparable. */
export default function ResultadoBadge({ resultado, prefijo = false }) {
  const valor = resultado || 'pendiente';
  return (
    <span className={`badge badge-res-${valor}`}>
      <span className="badge-dot" aria-hidden="true" />
      {prefijo && <span className="sr-only">Resultado de la reparación: </span>}
      {resultadoLabel(valor)}
    </span>
  );
}
