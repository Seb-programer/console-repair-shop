import { useCallback, useState } from 'react';
import { api, asList } from '../api/client';
import { useAsync } from '../utils/hooks';
import { useAuth } from '../context/auth';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import PasswordRequisitos from '../components/PasswordRequisitos';
import { Alert, ErrorMessage, ListState } from '../components/Feedback';
import { ROLES } from '../utils/permisos';
import { formatFecha } from '../utils/format';
import { errorPassword } from '../utils/password';

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [editando, setEditando] = useState(null);
  const [cambiando, setCambiando] = useState(null); // usuario a activar/desactivar
  const [aviso, setAviso] = useState('');

  const loader = useCallback(() => api.get('/usuarios').then((d) => asList(d, 'usuarios')), []);
  const { data, loading, error, reload } = useAsync(loader);
  const usuarios = data || [];

  const activoDe = (u) => Boolean(Number(u.activo ?? 1));

  return (
    <section>
      <PageHeader
        titulo="Usuarios"
        subtitulo="Cuentas de acceso y roles del equipo"
        acciones={(
          <button type="button" className="btn btn-primary" onClick={() => setEditando({})}>
            <Icon name="mas" size={18} /> Nuevo usuario
          </button>
        )}
      />
      <Alert onClose={() => setAviso('')}>{aviso}</Alert>

      <div className="card card-flush">
        <ListState loading={loading} error={error} onRetry={reload} vacio={usuarios.length === 0} vacioTitulo="No hay usuarios">
          <table className="tabla tabla-responsive">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Creado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const activo = activoDe(u);
                const soyYo = u.id === yo?.id;
                return (
                  <tr key={u.id} className={activo ? '' : 'fila-inactiva'}>
                    <td data-label="Nombre"><strong>{u.nombre}</strong>{soyYo && <span className="etiqueta">Tú</span>}</td>
                    <td data-label="Usuario">{u.usuario}</td>
                    <td data-label="Rol"><span className={`rol rol-${u.rol}`}>{ROLES[u.rol] || u.rol}</span></td>
                    <td data-label="Estado">
                      <span className={`etiqueta ${activo ? 'etiqueta-activo' : 'etiqueta-inactivo'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td data-label="Creado">{formatFecha(u.creado_en, false)}</td>
                    <td className="celda-acciones">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditando(u)} aria-label={`Editar a ${u.nombre}`}>
                        <Icon name="editar" size={16} /> Editar
                      </button>
                      {!soyYo && (
                        <button
                          type="button"
                          className={`btn btn-sm ${activo ? 'btn-danger-ghost' : 'btn-ghost'}`}
                          onClick={() => setCambiando(u)}
                        >
                          {activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ListState>
      </div>

      <Modal open={editando !== null} onClose={() => setEditando(null)} titulo={editando?.id ? 'Editar usuario' : 'Nuevo usuario'}>
        {editando !== null && (
          <UsuarioForm
            usuario={editando?.id ? editando : null}
            esYo={editando?.id === yo?.id}
            onCancel={() => setEditando(null)}
            onSaved={(msg) => { setEditando(null); setAviso(msg); reload(); }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={cambiando !== null}
        onClose={() => setCambiando(null)}
        peligro={cambiando ? activoDe(cambiando) : true}
        titulo={cambiando && activoDe(cambiando) ? 'Desactivar usuario' : 'Activar usuario'}
        mensaje={cambiando && (activoDe(cambiando)
          ? `“${cambiando.nombre}” no podrá iniciar sesión hasta que se reactive su cuenta.`
          : `“${cambiando.nombre}” podrá volver a iniciar sesión.`)}
        textoConfirmar={cambiando && activoDe(cambiando) ? 'Desactivar' : 'Activar'}
        onConfirm={async () => {
          if (activoDe(cambiando)) await api.del(`/usuarios/${cambiando.id}`);
          else await api.put(`/usuarios/${cambiando.id}`, { activo: true });
          setAviso(activoDe(cambiando) ? 'Usuario desactivado.' : 'Usuario activado.');
          reload();
        }}
      />
    </section>
  );
}

function UsuarioForm({ usuario, esYo, onSaved, onCancel }) {
  const editando = Boolean(usuario?.id);
  const [form, setForm] = useState({
    nombre: usuario?.nombre ?? '',
    usuario: usuario?.usuario ?? '',
    rol: usuario?.rol ?? 'operario',
    password: '',
    confirmar: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresCampo, setErroresCampo] = useState({});
  const set = (campo) => (e) => {
    const valor = e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    // Al corregir el campo, se recalcula (o limpia) su error.
    setErroresCampo((errs) => {
      if (!errs[campo]) return errs;
      const siguiente = { ...errs };
      if (campo === 'password') siguiente.password = errorPassword(valor) || undefined;
      else delete siguiente[campo];
      return siguiente;
    });
  };
  const validarPassword = !editando || Boolean(form.password);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.usuario.trim()) return setError('Nombre y usuario son obligatorios.');
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(form.usuario.trim())) {
      return setError('El usuario debe tener entre 3 y 50 caracteres (letras, números, punto, guion o guion bajo).');
    }
    if (validarPassword) {
      const errPass = !form.password ? 'La contraseña es obligatoria.' : errorPassword(form.password);
      const errConfirmar = !errPass && form.password !== form.confirmar ? 'Las contraseñas no coinciden.' : undefined;
      if (errPass || errConfirmar) {
        setErroresCampo({ password: errPass || undefined, confirmar: errConfirmar });
        setError(null);
        return undefined;
      }
    }
    setErroresCampo({});
    const body = { nombre: form.nombre.trim(), usuario: form.usuario.trim(), rol: form.rol };
    if (form.password) body.password = form.password;

    setEnviando(true);
    setError(null);
    try {
      if (editando) await api.put(`/usuarios/${usuario.id}`, body);
      else await api.post('/usuarios', body);
      onSaved(editando ? 'Usuario actualizado.' : `Usuario “${body.usuario}” creado.`);
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
    return undefined;
  };

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <ErrorMessage error={error} />
      <div className="grid-2">
        <Field label="Nombre completo" required value={form.nombre} onChange={set('nombre')} maxLength={100} />
        <Field label="Usuario" required value={form.usuario} onChange={set('usuario')} autoComplete="off" maxLength={50} />
      </div>
      <Field
        label="Rol"
        as="select"
        value={form.rol}
        onChange={set('rol')}
        disabled={esYo}
        hint={esYo ? 'No puedes cambiar tu propio rol de administrador.' : undefined}
      >
        {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Field>
      <div className="grid-2">
        <Field
          label={editando ? 'Nueva contraseña' : 'Contraseña'}
          required={!editando}
          type="password"
          value={form.password}
          onChange={set('password')}
          onBlur={() => {
            if (form.password) setErroresCampo((errs) => ({ ...errs, password: errorPassword(form.password) || undefined }));
          }}
          autoComplete="new-password"
          minLength={8}
          hint={editando ? 'Déjala vacía para conservar la actual.' : undefined}
          error={erroresCampo.password}
        />
        <Field
          label="Confirmar contraseña"
          required={!editando}
          type="password"
          value={form.confirmar}
          onChange={set('confirmar')}
          autoComplete="new-password"
          error={erroresCampo.confirmar}
        />
      </div>
      {validarPassword && <PasswordRequisitos password={form.password} />}
      <div className="form-acciones">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={enviando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}
