import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api, asObject } from '../../api/client';
import { useAsync } from '../../utils/hooks';
import { enlaceWhatsApp, fotoUrl } from '../../utils/format';
import Icon from '../Icon';
import { NOMBRE_POR_DEFECTO, redesDe } from './negocio';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/#trabajos', label: 'Trabajos', hash: true },
  { to: '/productos', label: 'Productos' },
  { to: '/#contacto', label: 'Contacto', hash: true },
];

export function MarcaPublica({ negocio }) {
  const logo = fotoUrl(negocio?.logo);
  const nombre = negocio?.nombre || NOMBRE_POR_DEFECTO;
  return (
    <span className="pub-marca">
      {logo
        ? <img src={logo} alt="" className="pub-marca-logo" />
        : <span className="marca-logo" aria-hidden="true"><Icon name="consola" size={22} /></span>}
      <span className="pub-marca-nombre">{nombre}</span>
    </span>
  );
}

/** Desplaza a #ancla al navegar (React Router no lo hace solo) o arriba al cambiar de página. */
function useScrollAncla() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    let intentos = 0;
    let timer;
    const ir = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        el.focus({ preventScroll: true });
      } else if (intentos++ < 10) {
        timer = setTimeout(ir, 100);
      }
    };
    ir();
    return () => clearTimeout(timer);
  }, [pathname, hash]);
}

export default function PublicLayout() {
  const loader = useCallback(() => api.get('/publico/negocio').then((d) => asObject(d, 'negocio')), []);
  const { data: negocio, loading: cargando, error } = useAsync(loader);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useScrollAncla();

  const nombre = negocio?.nombre || NOMBRE_POR_DEFECTO;
  useEffect(() => {
    document.title = nombre;
    return () => { document.title = 'Consolas App'; };
  }, [nombre]);

  // Cerrar el menú móvil al navegar
  const [rutaMenu, setRutaMenu] = useState(location.key);
  if (rutaMenu !== location.key) {
    setRutaMenu(location.key);
    setMenu(false);
  }

  const wa = enlaceWhatsApp(negocio?.whatsapp, 'Hola, quiero información sobre sus servicios.');
  const redes = redesDe(negocio);
  const anio = new Date().getFullYear();

  return (
    <div className="publico">
      <a href="#contenido-publico" className="skip-link">Saltar al contenido</a>
      <header className="pub-header">
        <div className="pub-contenedor pub-header-fila">
          <Link to="/" className="pub-marca-link" aria-label={`${nombre}, ir al inicio`}>
            <MarcaPublica negocio={negocio} />
          </Link>
          <button
            type="button"
            className="btn-icon pub-menu-btn"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="pub-nav"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icon name={menu ? 'cerrar' : 'menu'} />
          </button>
          <nav id="pub-nav" className={`pub-nav ${menu ? 'pub-nav-abierto' : ''}`} aria-label="Navegación principal">
            <ul>
              {NAV.map((n) => (
                <li key={n.to}>
                  {n.hash
                    ? <Link to={n.to} className="pub-nav-link">{n.label}</Link>
                    : <NavLink to={n.to} end={n.end} className="pub-nav-link">{n.label}</NavLink>}
                </li>
              ))}
              <li>
                <NavLink to="/consulta" className="btn btn-primary btn-sm pub-nav-cta">
                  <Icon name="buscar" size={16} /> Consulta tu consola
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="contenido-publico" className="pub-main" tabIndex={-1}>
        <Outlet context={{ negocio, cargando, error }} />
      </main>

      <footer className="pub-footer">
        <div className="pub-contenedor pub-footer-grid">
          <div className="pub-footer-col">
            <MarcaPublica negocio={negocio} />
            {negocio?.eslogan && <p className="pub-footer-texto">{negocio.eslogan}</p>}
            {redes.length > 0 && (
              <ul className="pub-redes" aria-label="Redes sociales">
                {redes.map((r) => (
                  <li key={r.clave}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="pub-red" aria-label={`${r.label} (se abre en una pestaña nueva)`}>
                      <Icon name={r.clave} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <nav className="pub-footer-col" aria-label="Enlaces del pie de página">
            <h2 className="pub-footer-titulo">Navegación</h2>
            <ul className="pub-footer-links">
              <li><Link to="/#servicios">Servicios</Link></li>
              <li><Link to="/#trabajos">Trabajos</Link></li>
              <li><Link to="/productos">Productos</Link></li>
              <li><Link to="/consulta">Consulta tu consola</Link></li>
            </ul>
          </nav>
          <div className="pub-footer-col">
            <h2 className="pub-footer-titulo">Contacto</h2>
            <ul className="pub-footer-links">
              {negocio?.telefono && <li><a href={`tel:${negocio.telefono}`}>{negocio.telefono}</a></li>}
              {negocio?.email && <li><a href={`mailto:${negocio.email}`}>{negocio.email}</a></li>}
              {negocio?.direccion && <li>{negocio.direccion}</li>}
              {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            </ul>
          </div>
        </div>
        <div className="pub-contenedor pub-footer-base">
          <span>© {anio} {nombre}</span>
          <Link to="/login" className="pub-acceso"><Icon name="candado" size={14} /> Acceso personal</Link>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="pub-wa-flotante" aria-label="Escríbenos por WhatsApp (se abre en una pestaña nueva)">
          <Icon name="whatsapp" size={26} />
        </a>
      )}
    </div>
  );
}
