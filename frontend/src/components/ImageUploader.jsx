import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Selector de imágenes con vista previa y opción de quitar antes de enviar.
 * Controlado: `files` (File[]) y `onChange(files)`.
 */
export default function ImageUploader({ files, onChange, max = 10, label = 'Fotos', multiple = true }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [aviso, setAviso] = useState('');

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const agregar = (lista) => {
    const nuevos = [];
    const rechazados = [];
    Array.from(lista).forEach((f) => {
      if (!TIPOS.includes(f.type)) rechazados.push(`${f.name}: formato no permitido`);
      else if (f.size > MAX_BYTES) rechazados.push(`${f.name}: supera 5 MB`);
      else nuevos.push(f);
    });
    let resultado = multiple ? [...files, ...nuevos] : nuevos.slice(0, 1);
    if (resultado.length > max) {
      rechazados.push(`Máximo ${max} foto${max === 1 ? '' : 's'}`);
      resultado = resultado.slice(0, max);
    }
    setAviso(rechazados.join(' · '));
    if (!multiple && nuevos.length === 0) return;
    onChange(resultado);
  };

  const quitar = (idx) => {
    onChange(files.filter((_, i) => i !== idx));
    setAviso('');
  };

  const onDrop = (e) => {
    e.preventDefault();
    agregar(e.dataTransfer.files);
  };

  const lleno = multiple && files.length >= max;

  return (
    <div className="uploader">
      <label htmlFor={inputId} className="form-label">
        {label} <span className="texto-suave">({files.length}/{max} · JPG, PNG o WEBP · máx. 5 MB)</span>
      </label>
      <div className="uploader-zona" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <Icon name="camara" size={28} />
        <p>Arrastra imágenes aquí o</p>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={lleno}
        >
          {multiple ? 'Seleccionar fotos' : (files.length ? 'Cambiar foto' : 'Seleccionar foto')}
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={TIPOS.join(',')}
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => { agregar(e.target.files); e.target.value = ''; }}
        />
      </div>
      {aviso && <p className="campo-error" role="alert">{aviso}</p>}
      {previews.length > 0 && (
        <ul className="uploader-previews">
          {previews.map((p, i) => (
            <li key={p.url} className="uploader-item">
              <img src={p.url} alt={`Vista previa ${i + 1}: ${p.file.name}`} />
              <button
                type="button"
                className="uploader-quitar"
                onClick={() => quitar(i)}
                aria-label={`Quitar ${p.file.name}`}
                title="Quitar"
              >
                <Icon name="cerrar" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
