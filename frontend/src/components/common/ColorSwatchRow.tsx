import { BOARD_COLORS } from '../../types';

interface ColorSwatchRowProps {
  value: string;
  onChange: (hex: string) => void;
}

export default function ColorSwatchRow({ value, onChange }: ColorSwatchRowProps) {
  const isCustom = !BOARD_COLORS.includes(value);
  return (
    <div className="swatch-row">
      {BOARD_COLORS.map((c) => (
        <div key={c} className={`swatch ${!isCustom && value === c ? 'active' : ''}`} style={{ background: c }} onClick={() => onChange(c)} />
      ))}
      <label className={`swatch-picker ${isCustom ? 'active' : ''}`} style={{ background: isCustom ? value : undefined }} title="Elegir otro color">
        {!isCustom && (
          <span className="swatch-picker-plus">
            <span />
            <span />
          </span>
        )}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
