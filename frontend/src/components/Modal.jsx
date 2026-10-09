import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';

/** Modal accesible basado en <dialog> nativo (atrapa el foco y cierra con Escape). */
export default function Modal({ open, onClose, titulo, children, footer, size = 'md', className = '' }) {
  const ref = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const onCancel = (e) => {
    e.preventDefault();
    onClose?.();
  };

  const onMouseDown = (e) => {
    // clic en el fondo (fuera del contenido) cierra
    if (e.target === ref.current) onClose?.();
  };

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size} ${className}`}
      aria-labelledby={titulo ? tituloId : undefined}
      onCancel={onCancel}
      onMouseDown={onMouseDown}
    >
      {open && (
        <div className="modal-contenido">
          <header className="modal-header">
            {titulo && <h2 id={tituloId}>{titulo}</h2>}
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
