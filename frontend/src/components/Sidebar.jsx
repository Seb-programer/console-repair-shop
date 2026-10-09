import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/auth';
import { ROLES } from '../utils/permisos';

const SECCIONES = [
  { to: '/panel', label: 'Panel', icon: 'panel', permiso: 'panel.ver', end: true },
  { to: '/panel/recepcion', label: 'Recepción', icon: 'recepcion', permiso: 'consolas.recibir' },
  { to: '/panel/consolas', label: 'Consolas', icon: 'consola', permiso: 'consolas.ver' },
  { to: '/panel/clientes', label: 'Clientes', icon: 'clientes', permiso: 'clientes.ver' },
  { to: '/panel/catalogo', label: 'Catálogo', icon: 'catalogo', permiso: 'articulos.ver' },
  { to: '/panel/ventas', label: 'Ventas', icon: 'ventas', permiso: 'ventas.ver' },
  { to: '/panel/usuarios', label: 'Usuarios', icon: 'usuarios', permiso: 'usuarios.gestionar' },
  { to: '/panel/pagina-web', label: 'Página web', icon: 'web', permiso: 'web.gestionar' },
];

export default function Sidebar({ abierto, onNavigate }) {
  const { usuario, puede, logout } = useAuth();
  const visibles = SECCIONES.filter((s) => puede(s.permiso));

  return (
    <aside id="menu-lateral" className={`sidebar ${abierto ? 'sidebar-abierto' : ''}`} aria-label="Menú principal">
      <div className="sidebar-marca">
        <span className="marca-logo" aria-hidden="true"><Icon name="consola" size={22} /></span>
        <span>Consolas<strong>App</strong></span>
      </div>
      <nav>
        <ul className="sidebar-nav">
          {visibles.map((s) => (
            <li key={s.to}>
              <NavLink to={s.to} end={s.end} className="sidebar-link" onClick={onNavigate}>
                <Icon name={s.icon} />
                <span>{s.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <a href="/" target="_blank" rel="noopener noreferrer" className="sidebar-link sidebar-link-externo" onClick={onNavigate}>
        <Icon name="externo" />
        <span>Ver página pública<span className="sr-only"> (se abre en una pestaña nueva)</span></span>
      </a>
      <div className="sidebar-usuario">
        <div className="avatar" aria-hidden="true">{(usuario?.nombre || '?').charAt(0).toUpperCase()}</div>
        <div className="sidebar-usuario-info">
          <span className="sidebar-usuario-nombre">{usuario?.nombre}</span>
          <span className="texto-suave">{ROLES[usuario?.rol] || usuario?.rol}</span>
        </div>
        <button type="button" className="btn-icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icon name="salir" />
        </button>
      </div>
    </aside>
  );
}
