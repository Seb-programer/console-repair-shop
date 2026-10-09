import { useEffect, useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import { fotoUrl } from '../../utils/format';

/** Fuente de video con "#t=0.1" para que el navegador muestre el primer cuadro como miniatura. */
const fuenteVideo = (url) => `${url}#t=0.1`;

/**
 * Cuadrícula de fotos y videos de trabajos con visor ampliado
 * (anterior/siguiente con botones y flechas del teclado).
 */
export default function GaleriaTrabajos({ elementos = [] }) {
  const items = elementos
    .map((e) => ({ ...e, url: fotoUrl(e.ruta), esVideo: e.tipo === 'video' }))
    .filter((e) => e.url);
  const total = items.length;
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    if (abierto === null || total < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setAbierto((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setAbierto((i) => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, total]);

  const actual = abierto !== null ? items[abierto] : null;
  const nombre = (it, i) => it.titulo || `${it.esVideo ? 'Video' : 'Foto'} ${i + 1}`;

  return (
    <>
      <ul className="pub-galeria">
        {items.map((it, i) => (
          <li key={it.id ?? it.url} className="pub-galeria-item">
            <figure>
              {it.esVideo ? (
                <div className="pub-galeria-media">
                  <video controls preload="metadata" playsInline src={fuenteVideo(it.url)} aria-label={nombre(it, i)} />
                  <span className="pub-galeria-tipo"><Icon name="video" size={14} /> Video</span>
                </div>
              ) : (
                <button type="button" className="pub-galeria-media pub-galeria-boton" onClick={() => setAbierto(i)} aria-label={`Ampliar ${nombre(it, i)}`}>
                  <img src={it.url} alt="" loading="lazy" />
                </button>
              )}
              {(it.titulo || it.descripcion || it.esVideo) && (
                <figcaption className="pub-galeria-pie">
                  <div>
                    {it.titulo && <strong>{it.titulo}</strong>}
                    {it.descripcion && <p className="texto-suave">{it.descripcion}</p>}
                  </div>
                  {it.esVideo && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAbierto(i)} aria-label={`Ver ${nombre(it, i)} en grande`}>
                      Ampliar
                    </button>
                  )}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      <Modal
        open={actual !== null}
        onClose={() => setAbierto(null)}
        titulo={actual ? `${nombre(actual, abierto)} · ${abierto + 1} de ${total}` : ''}
        size="lg"
        className="lightbox"
      >
        {actual && (
          <>
            <div className="lightbox-cuerpo">
              {total > 1 && (
                <button type="button" className="btn-icon lightbox-nav" onClick={() => setAbierto((abierto - 1 + total) % total)} aria-label="Anterior">
                  <Icon name="izq" size={28} />
                </button>
              )}
              {actual.esVideo
                ? <video key={actual.url} className="lightbox-video" src={actual.url} controls autoPlay playsInline />
                : <img src={actual.url} alt={actual.titulo || actual.descripcion || 'Trabajo realizado'} />}
              {total > 1 && (
                <button type="button" className="btn-icon lightbox-nav" onClick={() => setAbierto((abierto + 1) % total)} aria-label="Siguiente">
                  <Icon name="der" size={28} />
                </button>
              )}
            </div>
            {actual.descripcion && <p className="lightbox-pie texto-suave">{actual.descripcion}</p>}
          </>
        )}
      </Modal>
    </>
  );
}
