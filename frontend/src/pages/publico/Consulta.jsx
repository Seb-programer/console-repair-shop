import { useRef, useState } from 'react';
import { api, asList } from '../../api/client';
import { enlaceWhatsApp, esVerdadero, estadoRepuestoLabel, formatFecha, formatMoneda, nombreConsola } from '../../utils/format';
import Field from '../../components/Field';
import Icon from '../../components/Icon';
import EstadoBadge from '../../components/EstadoBadge';
import ResultadoBadge from '../../components/ResultadoBadge';
import Galeria from '../../components/Galeria';
import { Loading } from '../../components/Feedback';
import ProgresoEstado from '../../components/publico/ProgresoEstado';
import { useNegocio } from '../../components/publico/negocio';

/** El documento se envía sin espacios, puntos ni guiones (igual que lo normaliza el backend). */
const limpiarDocumento = (doc) => doc.replace(/[\s.-]/g, '');

const MENSAJE_RESULTADO = {
  pendiente: 'Nuestro técnico aún está revisando tu consola. Aquí verás el resultado en cuanto esté listo.',
  reparada: 'Tu consola fue reparada.',
  no_reparable: 'Lamentablemente tu consola no se pudo reparar.',
};

export default function Consulta() {
  const { negocio } = useNegocio();
  const [documento, setDocumento] = useState('');
  const [estado, setEstado] = useState({ fase: 'inicio' }); // inicio | cargando | ok | error
  const [errorCampo, setErrorCampo] = useState('');
  const resultadoRef = useRef(null);

  const consultar = async (e) => {
    e.preventDefault();
    const doc = limpiarDocumento(documento);
    if (!doc) { setErrorCampo('Escribe tu número de documento.'); return; }
    setErrorCampo('');
    setEstado({ fase: 'cargando' });
    try {
      const data = await api.post('/publico/consulta', { documento: doc });
      setEstado({ fase: 'ok', cliente: data?.cliente, consolas: asList(data, 'consolas') });
    } catch (err) {
      setEstado({ fase: 'error', error: err });
    }
    // Llevar el foco al resultado para lectores de pantalla y móviles
    requestAnimationFrame(() => resultadoRef.current?.focus());
  };

  const wa = (msg) => enlaceWhatsApp(negocio?.whatsapp, msg);

  return (
    <section className="pub-seccion pub-pagina" aria-labelledby="consulta-titulo">
      <div className="pub-contenedor pub-consulta">
        <div className="pub-consulta-form card">
          <span className="pub-servicio-icono" aria-hidden="true"><Icon name="buscar" size={26} /></span>
          <h1 id="consulta-titulo" className="pub-seccion-titulo">Consulta tu consola</h1>
          <p className="texto-suave">Escribe el número de documento con el que dejaste tu consola en el taller para ver su estado, el resultado de la reparación y el historial de trabajos.</p>
          <form className="form" onSubmit={consultar} noValidate>
            <Field
              label="Número de documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej. 1012345678"
              hint="Puedes escribirlo con o sin puntos."
              error={errorCampo}
              required
            />
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={estado.fase === 'cargando'}>
              {estado.fase === 'cargando' ? 'Consultando…' : 'Consultar'}
            </button>
          </form>
          <p className="texto-suave texto-sm pub-privacidad">
            <Icon name="escudo" size={16} /> Por tu seguridad solo mostramos información del equipo, nunca tus datos personales.
          </p>
        </div>

        <div ref={resultadoRef} tabIndex={-1} className="pub-consulta-resultado" aria-live="polite">
          {estado.fase === 'cargando' && <Loading texto="Buscando tus consolas…" />}
          {estado.fase === 'error' && <ErrorConsulta error={estado.error} wa={wa('Hola, quiero consultar el estado de mi consola.')} />}
          {estado.fase === 'ok' && (
            <>
              <h2 className="pub-consulta-saludo">
                Hola{estado.cliente?.nombre_corto ? `, ${estado.cliente.nombre_corto}` : ''}.
                {' '}<span className="texto-suave">
                  {estado.consolas.length === 1 ? 'Encontramos 1 consola.' : `Encontramos ${estado.consolas.length} consolas.`}
                </span>
              </h2>
              <ul className="pub-consolas">
                {estado.consolas.map((c) => (
                  <ConsolaCliente
                    key={c.id}
                    consola={c}
                    wa={wa(`Hola, quiero consultar por mi consola ${nombreConsola(c)} (orden #${c.id}).`)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorConsulta({ error, wa }) {
  if (error?.status === 404) {
    return (
      <div className="pub-aviso pub-aviso-info" role="alert">
        <Icon name="buscar" size={28} />
        <div>
          <h2>No encontramos consolas con ese documento</h2>
          <p>Revisa que el número esté escrito igual que cuando dejaste tu equipo. Si el problema continúa, escríbenos.</p>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm"><Icon name="whatsapp" size={16} /> Escríbenos por WhatsApp</a>}
        </div>
      </div>
    );
  }
  if (error?.status === 429) {
    return (
      <div className="pub-aviso pub-aviso-espera" role="alert">
        <Icon name="reloj" size={28} />
        <div>
          <h2>Demasiadas consultas seguidas</h2>
          <p>Por seguridad limitamos el número de consultas. Espera unos minutos e inténtalo de nuevo.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="pub-aviso pub-aviso-error" role="alert">
      <Icon name="alerta" size={28} />
      <div>
        <h2>No pudimos hacer la consulta</h2>
        <p>{error?.status ? error.message : 'No hay conexión con el servidor. Inténtalo de nuevo en un momento.'}</p>
      </div>
    </div>
  );
}

function ConsolaCliente({ consola: c, wa }) {
  const repuestos = c.repuestos || [];
  const procedimientos = c.procedimientos || [];
  const fotos = c.fotos || c.fotos_recepcion || [];
  const resultado = c.resultado_reparacion || 'pendiente';
  const tituloId = `consola-${c.id}-titulo`;

  return (
    <li className="card pub-consola" aria-labelledby={tituloId}>
      <header className="pub-consola-cabecera">
        <div>
          <h3 id={tituloId} className="pub-consola-nombre">{nombreConsola(c)}</h3>
          <p className="texto-suave texto-sm">
            Orden #{c.id}
            {c.color && ` · ${c.color}`}
            {c.serie_final && ` · Serie terminada en ${c.serie_final}`}
          </p>
        </div>
        <EstadoBadge estado={c.estado} />
      </header>

      <ProgresoEstado estado={c.estado} />

      <dl className="datos">
        <div className="dato"><dt>Ingresó</dt><dd>{formatFecha(c.fecha_ingreso)}</dd></div>
        {c.fecha_finalizacion && <div className="dato"><dt>Finalizada</dt><dd>{formatFecha(c.fecha_finalizacion)}</dd></div>}
        {c.falla_reportada && <div className="dato pub-dato-ancho"><dt>Falla reportada</dt><dd className="pre">{c.falla_reportada}</dd></div>}
      </dl>

      <section className={`pub-resultado pub-resultado-${resultado}`} aria-label="Resultado de la reparación">
        <div className="pub-resultado-cabecera">
          <h4>Resultado de la reparación</h4>
          <ResultadoBadge resultado={resultado} />
        </div>
        <p>{MENSAJE_RESULTADO[resultado] || MENSAJE_RESULTADO.pendiente}</p>
        {c.diagnostico_resultado && (
          <div className="pub-resultado-explicacion">
            <strong>Explicación del técnico</strong>
            <p className="pre">{c.diagnostico_resultado}</p>
          </div>
        )}
      </section>

      {(esVerdadero(c.necesita_repuestos) || repuestos.length > 0) && (
        <section aria-label="Repuestos necesarios" className="pub-subseccion">
          <h4><Icon name="repuesto" size={18} /> Repuestos necesarios</h4>
          {repuestos.length === 0 ? (
            <p className="texto-suave">Tu consola necesita repuestos; pronto publicaremos el detalle.</p>
          ) : (
            <div className="card card-flush">
              <table className="tabla tabla-responsive">
                <thead>
                  <tr>
                    <th scope="col">Repuesto</th>
                    <th scope="col" className="num">Cantidad</th>
                    <th scope="col" className="num">Costo estimado</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {repuestos.map((r, i) => (
                    <tr key={r.id ?? i}>
                      <td data-label="Repuesto">{r.nombre}</td>
                      <td data-label="Cantidad" className="num">{r.cantidad}</td>
                      <td data-label="Costo estimado" className="num">{r.costo_estimado != null && r.costo_estimado !== '' ? formatMoneda(r.costo_estimado) : 'Por definir'}</td>
                      <td data-label="Estado"><span className={`etiqueta-repuesto etiqueta-repuesto-${r.estado}`}>{estadoRepuestoLabel(r.estado)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {fotos.length > 0 && (
        <section aria-label="Fotos de recepción" className="pub-subseccion">
          <h4><Icon name="camara" size={18} /> Fotos de recepción</h4>
          <Galeria fotos={fotos} titulo="Foto de recepción" vacioTexto="" compacta />
        </section>
      )}

      <section aria-label="Historial de trabajos" className="pub-subseccion">
        <h4><Icon name="herramienta" size={18} /> Historial de trabajos</h4>
        {procedimientos.length === 0 ? (
          <p className="texto-suave">Aún no hay trabajos registrados. Te avisaremos cuando el técnico empiece.</p>
        ) : (
          <ol className="timeline">
            {procedimientos.map((p, i) => (
              <li key={p.id ?? `${p.creado_en}-${i}`} className={`timeline-item timeline-${p.estado_resultante}`}>
                <span className="timeline-punto" aria-hidden="true" />
                <div className="timeline-contenido">
                  <div className="timeline-cabecera">
                    <time className="texto-suave" dateTime={p.creado_en}>{formatFecha(p.creado_en)}</time>
                    <EstadoBadge estado={p.estado_resultante} />
                  </div>
                  <p className="pre">{p.descripcion}</p>
                  <Galeria fotos={p.fotos} titulo="Foto del trabajo" vacioTexto="" compacta />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secondary pub-consola-ayuda">
          <Icon name="whatsapp" size={18} /> ¿Dudas sobre esta consola? Escríbenos
        </a>
      )}
    </li>
  );
}
