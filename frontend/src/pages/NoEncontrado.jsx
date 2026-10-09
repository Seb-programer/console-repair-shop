import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NoEncontrado({ inicio = '/panel', textoBoton = 'Ir al panel' }) {
  return (
    <section className="pagina-mensaje">
      <Icon name="alerta" size={48} />
      <h1>Página no encontrada</h1>
      <p className="texto-suave">La dirección que buscas no existe.</p>
      <Link to={inicio} className="btn btn-primary">{textoBoton}</Link>
    </section>
  );
}
