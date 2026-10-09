import { estadoLabel } from '../utils/format';

export default function EstadoBadge({ estado }) {
  return (
    <span className={`badge badge-${estado || 'desconocido'}`}>
      <span className="badge-dot" aria-hidden="true" />
      {estadoLabel(estado)}
    </span>
  );
}
