import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, asObject, tokenStorage } from '../api/client';
import { tienePermiso } from '../utils/permisos';
import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(tokenStorage.get()));

  // Al recargar la página: si hay token, recuperar el usuario actual.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    let activo = true;
    api.get('/auth/me')
      .then((data) => { if (activo) setUsuario(asObject(data, 'usuario')); })
      .catch(() => { tokenStorage.clear(); if (activo) setUsuario(null); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const login = useCallback(async (usuarioLogin, password) => {
    const data = await api.post('/auth/login', { usuario: usuarioLogin, password });
    tokenStorage.set(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUsuario(null);
  }, []);

  const puede = useCallback((accion) => tienePermiso(usuario?.rol, accion), [usuario]);

  const value = useMemo(
    () => ({ usuario, cargando, login, logout, puede }),
    [usuario, cargando, login, logout, puede],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
