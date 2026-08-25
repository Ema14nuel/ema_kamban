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
      <button
        type="button"
        className="select2-control"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="select2-list">
            {filtered.length === 0 && <div className="select2-empty">Sin resultados</div>}
            {filtered.map((o) => (
              <div
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
