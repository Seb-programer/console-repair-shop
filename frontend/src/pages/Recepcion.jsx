import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import ClienteSelector from '../components/ClienteSelector';
import ConsolaCampos from '../components/ConsolaCampos';
import { CONSOLA_VACIA, consolaAFormData } from '../utils/consola';
import ImageUploader from '../components/ImageUploader';
import { ErrorMessage } from '../components/Feedback';

export default function Recepcion() {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(CONSOLA_VACIA);
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!cliente) { setError('Selecciona o crea un cliente antes de guardar.'); return; }
    const faltan = [['marca', 'Marca'], ['modelo', 'Modelo'], ['falla_reportada', 'Falla reportada']]
      .filter(([k]) => !form[k].trim()).map(([, l]) => l);
    if (faltan.length) { setError(`Completa los campos obligatorios: ${faltan.join(', ')}.`); return; }

    const fd = consolaAFormData(form);
    fd.append('cliente_id', cliente.id);
    fotos.forEach((f) => fd.append('fotos', f));

    setEnviando(true);
    setError(null);
    try {
      const consola = await api.post('/consolas', fd);
      navigate(consola?.id ? `/panel/consolas/${consola.id}` : '/panel/consolas', { state: { aviso: 'Consola recibida correctamente.' } });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  };

  return (
    <section>
      <PageHeader titulo="Recepción de consola" subtitulo="Registra el ingreso de un equipo al taller" />

      <div className="card">
        <h2 className="card-titulo"><span className="paso">1</span> Cliente</h2>
        <ClienteSelector value={cliente} onChange={setCliente} />
      </div>

      <form className="card form" onSubmit={onSubmit} noValidate aria-labelledby="titulo-consola">
        <h2 id="titulo-consola" className="card-titulo"><span className="paso">2</span> Datos de la consola</h2>
        <ConsolaCampos form={form} setForm={setForm} />

        <h2 className="card-titulo"><span className="paso">3</span> Fotos de recepción</h2>
        <ImageUploader files={fotos} onChange={setFotos} max={10} label="Fotos del estado en que llega el equipo" />

        <ErrorMessage error={error} />
        <div className="form-acciones">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar recepción'}
          </button>
        </div>
      </form>
    </section>
  );
}
