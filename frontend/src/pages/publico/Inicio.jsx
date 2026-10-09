import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, asList } from '../../api/client';
import { useAsync } from '../../utils/hooks';
import { enlaceWhatsApp } from '../../utils/format';
import Icon from '../../components/Icon';
import { ListState } from '../../components/Feedback';
import GaleriaTrabajos from '../../components/publico/GaleriaTrabajos';
import ProductoCard from '../../components/publico/ProductoCard';
import { NOMBRE_POR_DEFECTO, enlaceMapa, redesDe, useNegocio } from '../../components/publico/negocio';

const SERVICIOS = [
  {
    icon: 'herramienta',
    titulo: 'Mantenimiento',
    texto: 'Limpieza interna, cambio de pasta térmica y revisión de ventiladores para que tu consola trabaje fresca y silenciosa.',
  },
  {
    icon: 'repuesto',
    titulo: 'Reparación',
    texto: 'Diagnóstico de fallas de imagen, encendido, lectores, puertos HDMI y controles. Te explicamos qué tiene y cuánto cuesta antes de reparar.',
  },
  {
    icon: 'carrito',
    titulo: 'Venta',
    texto: 'Consolas, controles, accesorios y repuestos. Pregunta por disponibilidad y te respondemos por WhatsApp.',
  },
];

const DESTACADOS = 8;

function Seccion({ id, titulo, subtitulo, children, className = '', accion }) {
  return (
    <section id={id} className={`pub-seccion ${className}`} aria-labelledby={`${id}-titulo`} tabIndex={-1}>
      <div className="pub-contenedor">
        <header className="pub-seccion-cabecera">
          <div>
            <h2 id={`${id}-titulo`} className="pub-seccion-titulo">{titulo}</h2>
            {subtitulo && <p className="pub-seccion-sub">{subtitulo}</p>}
          </div>
          {accion}
        </header>
        {children}
      </div>
    </section>
  );
}

export default function Inicio() {
  const { negocio, cargando } = useNegocio();

  const galeriaLoader = useCallback(() => api.get('/publico/galeria').then((d) => asList(d, 'galeria', 'elementos')), []);
  const galeria = useAsync(galeriaLoader);
  const productosLoader = useCallback(() => api.get('/publico/articulos').then((d) => asList(d, 'articulos')), []);
  const productos = useAsync(productosLoader);

  const nombre = negocio?.nombre || (cargando ? '' : NOMBRE_POR_DEFECTO);
  const wa = enlaceWhatsApp(negocio?.whatsapp, 'Hola, quiero información sobre sus servicios.');
  const elementos = galeria.data || [];
  const destacados = (productos.data || []).slice(0, DESTACADOS);

  return (
    <>
      <section className="pub-hero" aria-labelledby="hero-titulo">
        <div className="pub-contenedor pub-hero-grid">
          <div className="pub-hero-texto">
            <p className="pub-hero-kicker">Mantenimiento · Reparación · Venta</p>
            <h1 id="hero-titulo" className="pub-hero-titulo">{nombre || ' '}</h1>
            {negocio?.eslogan && <p className="pub-hero-eslogan">{negocio.eslogan}</p>}
            {negocio?.descripcion && <p className="pub-hero-desc">{negocio.descripcion}</p>}
            <div className="pub-hero-acciones">
              <Link to="/consulta" className="btn btn-primary btn-lg">
                <Icon name="buscar" size={18} /> Consulta tu consola
              </Link>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-lg">
                  <Icon name="whatsapp" size={18} /> Escríbenos por WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="pub-hero-visual" aria-hidden="true">
            <div className="pub-hero-tarjeta">
              <Icon name="consola" size={120} />
              <ul className="pub-hero-chips">
                <li><span className="badge badge-en_espera"><span className="badge-dot" />Recibida</span></li>
                <li><span className="badge badge-en_proceso"><span className="badge-dot" />En proceso</span></li>
                <li><span className="badge badge-finalizado"><span className="badge-dot" />Finalizada</span></li>
              </ul>
              <p>Sigue el estado de tu equipo en línea con tu número de documento.</p>
            </div>
          </div>
        </div>
      </section>

      <Seccion id="servicios" titulo="Servicios" subtitulo="Todo lo que tu consola necesita, en un solo lugar.">
        <ul className="pub-servicios">
          {SERVICIOS.map((s) => (
            <li key={s.titulo} className="pub-servicio">
              <span className="pub-servicio-icono" aria-hidden="true"><Icon name={s.icon} size={26} /></span>
              <h3>{s.titulo}</h3>
              <p className="texto-suave">{s.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion id="trabajos" titulo="Trabajos realizados" subtitulo="Algunas de las consolas que han pasado por nuestro taller." className="pub-seccion-alt">
        <ListState
          loading={galeria.loading && !galeria.data}
          error={galeria.error}
          onRetry={galeria.reload}
          vacio={elementos.length === 0}
          vacioTitulo="Pronto publicaremos nuestros trabajos"
          vacioTexto="Vuelve más tarde para ver fotos y videos del taller."
        >
          <GaleriaTrabajos elementos={elementos} />
        </ListState>
      </Seccion>

      <Seccion
        id="productos"
        titulo="Productos destacados"
        subtitulo="Precios en pesos colombianos. Escríbenos para apartar el tuyo."
        accion={<Link to="/productos" className="btn btn-secondary">Ver todos los productos <Icon name="der" size={16} /></Link>}
      >
        <ListState
          loading={productos.loading && !productos.data}
          error={productos.error}
          onRetry={productos.reload}
          vacio={destacados.length === 0}
          vacioTitulo="Aún no hay productos publicados"
        >
          <ul className="grid-articulos">
            {destacados.map((a) => <ProductoCard key={a.id} articulo={a} whatsapp={negocio?.whatsapp} />)}
          </ul>
        </ListState>
      </Seccion>

      <Seccion id="contacto" titulo="Contacto" subtitulo="Visítanos o escríbenos, con gusto te atendemos." className="pub-seccion-alt">
        <Contacto negocio={negocio} wa={wa} />
      </Seccion>
    </>
  );
}

function Contacto({ negocio, wa }) {
  const mapa = enlaceMapa(negocio?.direccion);
  const redes = redesDe(negocio);
  const datos = [
    negocio?.direccion && {
      icon: 'ubicacion', label: 'Dirección', valor: negocio.direccion,
      extra: mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="link">Ver en el mapa</a>,
    },
    negocio?.horario && { icon: 'reloj', label: 'Horario', valor: negocio.horario },
    negocio?.telefono && { icon: 'telefono', label: 'Teléfono', valor: <a href={`tel:${negocio.telefono}`} className="link">{negocio.telefono}</a> },
    negocio?.email && { icon: 'correo', label: 'Correo', valor: <a href={`mailto:${negocio.email}`} className="link">{negocio.email}</a> },
  ].filter(Boolean);

  if (!negocio) return <p className="texto-suave">La información de contacto no está disponible en este momento.</p>;

  return (
    <div className="pub-contacto">
      <dl className="pub-contacto-datos">
        {datos.map((d) => (
          <div key={d.label} className="pub-contacto-dato">
            <span className="pub-contacto-icono" aria-hidden="true"><Icon name={d.icon} size={20} /></span>
            <div>
              <dt>{d.label}</dt>
              <dd className="pre">{d.valor}</dd>
              {d.extra && <dd>{d.extra}</dd>}
            </div>
          </div>
        ))}
      </dl>
      <div className="pub-contacto-cta">
        <h3>¿Tu consola necesita ayuda?</h3>
        <p className="texto-suave">Cuéntanos qué le pasa y te orientamos sin compromiso.</p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-block">
            <Icon name="whatsapp" size={18} /> Escríbenos por WhatsApp
          </a>
        )}
        {redes.length > 0 && (
          <>
            <p className="texto-suave texto-sm">Síguenos en redes</p>
            <ul className="pub-redes pub-redes-grandes">
              {redes.map((r) => (
                <li key={r.clave}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="pub-red pub-red-texto">
                    <Icon name={r.clave} size={18} /> {r.label}<span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
