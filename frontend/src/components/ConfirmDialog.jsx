import { useState } from 'react';
import Modal from './Modal';
import { ErrorMessage } from './Feedback';

/**
 * Diálogo de confirmación para acciones destructivas.
 * `onConfirm` puede ser async; si lanza error se muestra y el diálogo sigue abierto.
 */
export default function ConfirmDialog({
  open, onClose, onConfirm, titulo = '¿Confirmar acción?', mensaje,
  textoConfirmar = 'Confirmar', peligro = true,
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cerrar = () => { setError(null); onClose(); };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={cerrar}
      titulo={titulo}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={cerrar} disabled={enviando}>Cancelar</button>
          <button
            type="button"
            className={`btn ${peligro ? 'btn-danger' : 'btn-primary'}`}
            onClick={confirmar}
            disabled={enviando}
          >
            {enviando ? 'Procesando…' : textoConfirmar}
          </button>
        </>
      )}
    >
      {mensaje && <p>{mensaje}</p>}
      <ErrorMessage error={error} />
    </Modal>
  );
}
