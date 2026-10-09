import { useId } from 'react';

/**
 * Campo de formulario con label asociado. `as` = 'input' | 'textarea' | 'select'.
 * Las props restantes se pasan al control.
 */
export default function Field({ label, as = 'input', hint, error, required, className = '', children, ...props }) {
  const id = useId();
  const Control = as;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}{required && <span className="requerido" aria-hidden="true"> *</span>}
      </label>
      <Control
        id={id}
        className={as === 'select' ? 'input select' : 'input'}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </Control>
      {hint && <p id={`${id}-hint`} className="campo-hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="campo-error">{error}</p>}
    </div>
  );
}
