import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/publico/PublicLayout';
import Inicio from './pages/publico/Inicio';
import Productos from './pages/publico/Productos';
import Consulta from './pages/publico/Consulta';
import Login from './pages/Login';
import Panel from './pages/Panel';
import Recepcion from './pages/Recepcion';
import Consolas from './pages/Consolas';
import ConsolaDetalle from './pages/ConsolaDetalle';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Catalogo from './pages/Catalogo';
import Ventas from './pages/Ventas';
import NuevaVenta from './pages/NuevaVenta';
import VentaDetalle from './pages/VentaDetalle';
import Usuarios from './pages/Usuarios';
import PaginaWeb from './pages/PaginaWeb';
import NoEncontrado from './pages/NoEncontrado';

const rutaCon = (permiso, elemento) => <ProtectedRoute permiso={permiso}>{elemento}</ProtectedRoute>;

/** Rutas internas anteriores a la fase 2: redirigen a su equivalente bajo /panel. */
const RUTAS_ANTIGUAS = ['/recepcion', '/consolas/*', '/clientes/*', '/catalogo', '/ventas/*', '/usuarios'];

function RedirigirAlPanel() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/panel${pathname}${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Sitio público (sin login) */}
      <Route element={<PublicLayout />}>
        <Route index element={<Inicio />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/consulta" element={<Consulta />} />
        <Route path="*" element={<NoEncontrado inicio="/" textoBoton="Ir al inicio" />} />
      </Route>

      <Route path="/login" element={<Login />} />
      {RUTAS_ANTIGUAS.map((ruta) => <Route key={ruta} path={ruta} element={<RedirigirAlPanel />} />)}

      {/* Aplicación interna */}
      <Route path="/panel" element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={rutaCon('panel.ver', <Panel />)} />
          <Route path="recepcion" element={rutaCon('consolas.recibir', <Recepcion />)} />
          <Route path="consolas" element={rutaCon('consolas.ver', <Consolas />)} />
          <Route path="consolas/:id" element={rutaCon('consolas.ver', <ConsolaDetalle />)} />
          <Route path="clientes" element={rutaCon('clientes.ver', <Clientes />)} />
          <Route path="clientes/:id" element={rutaCon('clientes.ver', <ClienteDetalle />)} />
          <Route path="catalogo" element={rutaCon('articulos.ver', <Catalogo />)} />
          <Route path="ventas" element={rutaCon('ventas.ver', <Ventas />)} />
          <Route path="ventas/nueva" element={rutaCon('ventas.crear', <NuevaVenta />)} />
          <Route path="ventas/:id" element={rutaCon('ventas.ver', <VentaDetalle />)} />
          <Route path="usuarios" element={rutaCon('usuarios.gestionar', <Usuarios />)} />
          <Route path="pagina-web" element={rutaCon('web.gestionar', <PaginaWeb />)} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}
