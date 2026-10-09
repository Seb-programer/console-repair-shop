import { useEffect, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { fotoUrl } from '../utils/format';

/** Galería de miniaturas; clic para ampliar, con navegación anterior/siguiente (también con flechas). */
export default function Galeria({ fotos = [], titulo = 'Foto', vacioTexto = 'Sin fotos.', compacta = false }) {
  const [abierta, setAbierta] = useState(null);
  const urls = (fotos || []).map(fotoUrl).filter(Boolean);
  const total = urls.length;

  useEffect(() => {
    if (abierta === null || total < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setAbierta((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setAbierta((i) => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierta, total]);

  if (total === 0) return vacioTexto ? <p className="texto-suave">{vacioTexto}</p> : null;

  return (
    <>
      <ul className={`galeria ${compacta ? 'galeria-compacta' : ''}`}>
        {urls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <button
              type="button"
              className="galeria-item"
              onClick={() => setAbierta(i)}
              aria-label={`Ampliar ${titulo.toLowerCase()} ${i + 1} de ${total}`}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      <Modal
        open={abierta !== null}
        onClose={() => setAbierta(null)}
        titulo={abierta !== null ? `${titulo} ${abierta + 1} de ${total}` : ''}
        size="lg"
        className="lightbox"
      >
        {abierta !== null && (
          <div className="lightbox-cuerpo">
            {total > 1 && (
              <button type="button" className="btn-icon lightbox-nav" onClick={() => setAbierta((abierta - 1 + total) % total)} aria-label="Foto anterior">
                <Icon name="izq" size={28} />
              </button>
            )}
            <img src={urls[abierta]} alt={`${titulo} ${abierta + 1}`} />
            {total > 1 && (
              <button type="button" className="btn-icon lightbox-nav" onClick={() => setAbierta((abierta + 1) % total)} aria-label="Foto siguiente">
                <Icon name="der" size={28} />
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
