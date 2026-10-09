import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { Loading } from './Feedback';
import NoAutorizado from '../pages/NoAutorizado';

/** Exige sesión iniciada y, opcionalmente, un permiso de la matriz de roles. */
export default function ProtectedRoute({ permiso, children }) {
  const { usuario, cargando, puede } = useAuth();
  const location = useLocation();

  if (cargando) return <Loading texto="Verificando sesión…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location }} />;
  if (permiso && !puede(permiso)) return <NoAutorizado />;
  return children ?? <Outlet />;
}
