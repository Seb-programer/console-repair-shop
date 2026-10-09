import Icon from '../Icon';
import { enlaceWhatsApp, esVerdadero, formatMoneda, fotoUrl } from '../../utils/format';

/** Tarjeta de producto del sitio público con botón "Lo quiero" (WhatsApp con mensaje prellenado). */
export default function ProductoCard({ articulo, whatsapp }) {
  const disponible = esVerdadero(articulo.disponible);
  const foto = fotoUrl(articulo.foto);
  const precio = formatMoneda(articulo.precio);
  const mensaje = disponible
    ? `Hola, me interesa el producto "${articulo.nombre}" (${precio}) que vi en su página web. ¿Me pueden dar más información?`
    : `Hola, vi el producto "${articulo.nombre}" en su página web y aparece agotado. ¿Me avisan cuando esté disponible?`;
  const wa = enlaceWhatsApp(whatsapp, mensaje);

  return (
    <li className={`articulo pub-producto ${disponible ? '' : 'pub-producto-agotado'}`}>
      <div className="articulo-foto">
        {foto ? <img src={foto} alt={articulo.nombre} loading="lazy" /> : <Icon name="imagen" size={40} />}
        {!disponible && <span className="etiqueta etiqueta-inactivo">Agotado</span>}
      </div>
      <div className="articulo-cuerpo">
        {articulo.categoria && <span className="articulo-categoria">{articulo.categoria}</span>}
        <h3 className="articulo-nombre">{articulo.nombre}</h3>
        {articulo.descripcion && <p className="articulo-desc texto-suave">{articulo.descripcion}</p>}
        <div className="articulo-pie">
          <span className="articulo-precio">{precio}</span>
          {disponible && <span className="stock">Disponible</span>}
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-block ${disponible ? 'btn-whatsapp' : 'btn-secondary'}`}
            aria-label={`${disponible ? 'Lo quiero' : 'Avísame cuando llegue'}: ${articulo.nombre} (abre WhatsApp)`}
          >
            <Icon name="whatsapp" size={18} /> {disponible ? 'Lo quiero' : 'Avísame cuando llegue'}
          </a>
        )}
      </div>
    </li>
  );
}
