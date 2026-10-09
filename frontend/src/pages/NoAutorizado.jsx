import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NoAutorizado() {
  return (
    <section className="pagina-mensaje">
      <Icon name="usuarios" size={48} />
      <h1>Acceso restringido</h1>
      <p className="texto-suave">Tu rol no tiene permiso para ver esta sección.</p>
      <Link to="/panel" className="btn btn-primary">Ir al panel</Link>
    </section>
  );
}
