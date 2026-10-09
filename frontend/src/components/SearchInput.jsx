import { useId } from 'react';
import Icon from './Icon';

export default function SearchInput({ value, onChange, placeholder = 'Buscar…', label = 'Buscar' }) {
  const id = useId();
  return (
    <div className="search">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Icon name="buscar" size={18} className="search-icon" />
      <input
        id={id}
        type="search"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
