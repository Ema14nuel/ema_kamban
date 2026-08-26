import { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { BOARD_COLORS } from '../../types';
import type { BoardBgType } from '../../types';
import { autoGradient } from '../../lib/color';
import Modal from '../common/Modal';

function extractGradientBase(css: string, fallback: string): string {
  const m = css.match(/,\s*(#[0-9a-fA-F]{6})\s+\d/);
  return m ? m[1] : fallback;
}

interface ColorSwatchRowProps {
  value: string;
  onChange: (hex: string) => void;
}

function ColorSwatchRow({ value, onChange }: ColorSwatchRowProps) {
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

export default function BoardModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const boards = useBoardStore((s) => s.boards);
  const addBoard = useBoardStore((s) => s.addBoard);
  const updateBoard = useBoardStore((s) => s.updateBoard);
  const removeBoard = useBoardStore((s) => s.removeBoard);

  const editing = modal.boardId ? boards.find((b) => b.id === modal.boardId) : null;

  const [name, setName] = useState(editing?.name || '');
  const [color, setColor] = useState(editing?.color || BOARD_COLORS[0]);
  const [bgType, setBgType] = useState<BoardBgType>(editing?.bgType || 'gradient');
  const [solidColor, setSolidColor] = useState(editing?.bgType === 'color' ? editing.bgValue : BOARD_COLORS[0]);
  const [gradientColor, setGradientColor] = useState(
    editing?.bgType === 'gradient' ? extractGradientBase(editing.bgValue, editing.color) : editing?.color || BOARD_COLORS[0],
  );
  const [imageUrl, setImageUrl] = useState(editing?.bgType === 'image' ? editing.bgValue : '');
  const [musicUrl, setMusicUrl] = useState(editing?.musicUrl || '');

  const bgValue = bgType === 'gradient' ? autoGradient(gradientColor) : bgType === 'color' ? solidColor : imageUrl;

  async function onSave() {
    if (!name.trim()) return;
    const musicName = musicUrl ? 'enlace' : 'ninguna';
    const input = { name: name.trim(), color, bgType, bgValue, musicUrl, musicName };
    if (editing) {
      await updateBoard(editing.id, input);
    } else {
      await addBoard(input);
    }
    closeModal();
  }

  return (
    <Modal
      title={editing ? 'Configurar tablero' : 'Nuevo tablero'}
      onClose={closeModal}
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeBoard(editing.id);
                closeModal();
              }}
            >
              Borrar tablero
            </button>
          )}
          <button type="button" className="btn" onClick={closeModal}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" disabled={!name.trim()} onClick={onSave}>
            Guardar
          </button>
        </>
      }
    >
      <div className="field">
        <label>Nombre</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del tablero" />
      </div>

      <div className="field">
        <label>Color</label>
        <ColorSwatchRow value={color} onChange={setColor} />
      </div>

      <div className="field">
        <label>Tipo de fondo</label>
        <div className="row-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {(['gradient', 'color', 'image'] as BoardBgType[]).map((t) => (
            <button key={t} type="button" className={`btn ${bgType === t ? 'btn-accent' : ''}`} onClick={() => setBgType(t)}>
              {t === 'gradient' ? 'Degradado' : t === 'color' ? 'Color' : 'Imagen'}
            </button>
          ))}
        </div>
      </div>

      {bgType === 'image' && (
        <div className="field">
          <label>URL de la imagen</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
      )}

      {bgType === 'color' && (
        <div className="field">
          <label>Color de fondo</label>
          <ColorSwatchRow value={solidColor} onChange={setSolidColor} />
        </div>
      )}

      {bgType === 'gradient' && (
        <div className="field">
          <label>Color base del degradado</label>
          <ColorSwatchRow value={gradientColor} onChange={setGradientColor} />
          <div className="gradient-preview" style={{ background: bgValue }} />
        </div>
      )}

      <div className="field">
        <label>Música por URL (opcional)</label>
        <input type="url" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="https://…" />
      </div>
    </Modal>
  );
}
