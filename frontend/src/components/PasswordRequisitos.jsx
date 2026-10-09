import Icon from './Icon';
import { requisitosPassword } from '../utils/password';

/** Lista de requisitos de la contraseña con su estado (✓ cumplido / • pendiente). */
export default function PasswordRequisitos({ password, id }) {
  const requisitos = requisitosPassword(password);
  return (
    <ul id={id} className="password-requisitos" aria-label="Requisitos de la contraseña">
      {requisitos.map((r) => (
        <li key={r.id} className={r.ok ? 'cumplido' : ''}>
          {r.ok
            ? <Icon name="check" size={14} />
            : <span className="password-requisito-punto" aria-hidden="true" />}
          <span>{r.texto}</span>
          <span className="sr-only">{r.ok ? ' (cumplido)' : ' (pendiente)'}</span>
        </li>
      ))}
    </ul>
  );
}
