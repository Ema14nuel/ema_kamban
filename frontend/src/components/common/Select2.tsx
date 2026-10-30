import { useEffect, useRef, useState } from 'react';
import './select2.css';

export interface Select2Option {
  id: string;
  label: string;
  color?: string;
}

interface Select2Props {
  options: Select2Option[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}

export default function Select2({ options, value, onChange, placeholder = 'Seleccionar…' }: Select2Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) || null;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="select2" ref={ref}>
      <select className="select2-native" aria-label={placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <button
        type="button"
        className="select2-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
      >
        {selected ? (
          <span className="select2-value">
            {selected.color && <span className="select2-dot" style={{ background: selected.color }} />}
            {selected.label}
          </span>
        ) : (
          <span className="select2-placeholder">{placeholder}</span>
        )}
        <span className="select2-caret">▾</span>
      </button>
      {open && (
        <div className="select2-menu pop-in">
          <input
            autoFocus
            className="select2-search"
            placeholder="Buscar…"
            aria-label={`Buscar en ${placeholder}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="select2-list" role="listbox" aria-label={placeholder}>
            {filtered.length === 0 && <div className="select2-empty">Sin resultados</div>}
            {filtered.map((o) => (
              <button
                type="button"
                role="option"
                aria-selected={o.id === value}
                key={o.id}
                className="select2-item"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.color && <span className="select2-dot" style={{ background: o.color }} />}
                <span className="select2-item-label">{o.label}</span>
                {o.id === value && <span className="select2-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
