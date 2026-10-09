import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Icon from './Icon';

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrar = () => setMenuAbierto(false);

  return (
    <div className="app">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="topbar">
        <button
          type="button"
          className="btn-icon"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
        >
          <Icon name={menuAbierto ? 'cerrar' : 'menu'} />
        </button>
        <span className="topbar-titulo">Consolas<strong>App</strong></span>
      </header>
      <Sidebar abierto={menuAbierto} onNavigate={cerrar} />
      {menuAbierto && <div className="sidebar-fondo" onClick={cerrar} aria-hidden="true" />}
      <main id="contenido" className="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
