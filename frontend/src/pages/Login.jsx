import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { ErrorMessage, Alert, Loading } from '../components/Feedback';

export default function Login() {
  const { usuario, cargando, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  if (cargando) return <Loading texto="Verificando sesión…" />;
  if (usuario) return <Navigate to="/panel" replace />;

  const desde = location.state?.desde;
  const destino = desde?.pathname?.startsWith('/panel') ? desde.pathname + (desde.search || '') : '/panel';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.usuario.trim() || !form.password) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await login(form.usuario.trim(), form.password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  };

  return (
    <main className="login">
      <section className="login-card" aria-labelledby="login-titulo">
        <div className="login-marca">
          <span className="marca-logo" aria-hidden="true"><Icon name="consola" size={28} /></span>
          <h1 id="login-titulo">Consolas<strong>App</strong></h1>
          <p className="texto-suave">Mantenimiento, reparación y venta de consolas</p>
        </div>
        {params.get('expirada') && !error && (
          <Alert tipo="info">Tu sesión expiró. Inicia sesión de nuevo.</Alert>
        )}
        <form onSubmit={onSubmit} className="form" noValidate>
          <ErrorMessage error={error} />
          <Field
            label="Usuario"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            autoComplete="username"
            autoFocus
            required
          />
          <Field
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <Link to="/" className="link texto-sm login-volver">← Volver a la página principal</Link>
      </section>
    </main>
  );
}
