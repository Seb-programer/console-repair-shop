import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function PageHeader({ titulo, subtitulo, volver, acciones }) {
  return (
    <header className="page-header">
      <div>
        {volver && (
          <Link to={volver} className="link-volver">
            <Icon name="atras" size={16} /> Volver
          </Link>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <p className="texto-suave">{subtitulo}</p>}
      </div>
      {acciones && <div className="page-acciones">{acciones}</div>}
    </header>
  );
}
