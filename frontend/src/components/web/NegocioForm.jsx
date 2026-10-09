import { useState } from 'react';
import { api } from '../../api/client';
import Field from '../Field';
import ImageUploader from '../ImageUploader';
import { ErrorMessage } from '../Feedback';
import { fotoUrl } from '../../utils/format';

const CAMPOS = ['nombre', 'eslogan', 'descripcion', 'direccion', 'telefono', 'whatsapp', 'email', 'horario', 'facebook', 'instagram', 'tiktok'];

const esUrl = (v) => /^https?:\/\/\S+$/i.test(v);

function validar(f) {
  const err = {};
  if (!f.nombre.trim()) err.nombre = 'El nombre es obligatorio.';
  if (f.whatsapp.trim() && !/^\d{7,15}$/.test(f.whatsapp.trim())) err.whatsapp = 'Solo dígitos, con indicativo de país (7 a 15 dígitos).';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) err.email = 'Correo no válido.';
  ['facebook', 'instagram', 'tiktok'].forEach((k) => {
    if (f[k].trim() && !esUrl(f[k].trim())) err[k] = 'Debe ser una URL completa (https://…).';
  });
  return err;
}

/** Información del negocio que se muestra en la página pública (multipart con `logo` opcional). */
export default function NegocioForm({ negocio, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(CAMPOS.map((k) => [k, negocio?.[k] ?? ''])));
  const [logo, setLogo] = useState([]);
  const [quitarLogo, setQuitarLogo] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const logoActual = !quitarLogo && !logo.length ? fotoUrl(negocio?.logo) : null;
  const campo = (k) => ({
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
    error: errores[k],
  });

  const enviar = async (e) => {
    e.preventDefault();
    const err = validar(form);
    setErrores(err);
    if (Object.keys(err).length) { setError('Revisa los campos marcados.'); return; }
    const fd = new FormData();
    CAMPOS.forEach((k) => fd.append(k, form[k].trim()));
    if (logo[0]) fd.append('logo', logo[0]);
    else if (quitarLogo) fd.append('quitar_logo', '1');
    setEnviando(true);
    setError(null);
    try {
      await api.put('/negocio', fd);
      setLogo([]);
      setQuitarLogo(false);
      onSaved();
    } catch (ex) {
      setError(ex);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <div className="grid-2">
        <Field label="Nombre del negocio" required maxLength={150} {...campo('nombre')} />
        <Field label="Eslogan" maxLength={255} {...campo('eslogan')} placeholder="Tu consola en las mejores manos" />
      </div>
      <Field label="Descripción" as="textarea" rows={4} {...campo('descripcion')} hint="Aparece en la portada de la página pública." />
      <div className="grid-2">
        <Field label="Dirección" maxLength={255} {...campo('direccion')} />
        <Field label="Horario" maxLength={255} {...campo('horario')} placeholder="Lunes a sábado 9:00 a. m. - 7:00 p. m." />
        <Field label="Teléfono" type="tel" maxLength={30} {...campo('telefono')} />
        <Field
          label="WhatsApp"
          inputMode="numeric"
          maxLength={15}
          {...campo('whatsapp')}
          placeholder="573001234567"
          hint="Solo dígitos con indicativo de país. Se usa en los botones de WhatsApp."
        />
        <Field label="Correo" type="email" maxLength={150} {...campo('email')} />
      </div>
      <fieldset className="fieldset">
        <legend className="form-label">Redes sociales (opcional)</legend>
        <div className="grid-2">
          <Field label="Facebook" type="url" {...campo('facebook')} placeholder="https://facebook.com/…" />
          <Field label="Instagram" type="url" {...campo('instagram')} placeholder="https://instagram.com/…" />
          <Field label="TikTok" type="url" {...campo('tiktok')} placeholder="https://tiktok.com/@…" />
        </div>
      </fieldset>

      {logoActual && (
        <div className="foto-actual">
          <img src={logoActual} alt="Logo actual" className="logo-actual" />
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQuitarLogo(true)}>Quitar logo</button>
        </div>
      )}
      {quitarLogo && !logo.length && (
        <p className="texto-suave texto-sm">
          El logo se quitará al guardar.{' '}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQuitarLogo(false)}>Deshacer</button>
        </p>
      )}
      <ImageUploader files={logo} onChange={setLogo} max={1} multiple={false} label={logoActual ? 'Reemplazar logo' : 'Logo'} />

      <ErrorMessage error={error} />
      <div className="form-acciones">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar información'}</button>
      </div>
    </form>
  );
}
