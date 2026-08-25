import { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { BOARD_COLORS, BOARD_GRADIENTS, BOARD_SOLIDS } from '../../types';
import type { BoardBgType } from '../../types';
import Modal from '../common/Modal';

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
  const [bgValue, setBgValue] = useState(editing?.bgValue || BOARD_GRADIENTS[0]);
  const [musicUrl, setMusicUrl] = useState(editing?.musicUrl || '');

  function onSave() {
    if (!name.trim()) return;
    const musicName = musicUrl ? 'enlace' : 'ninguna';
    if (editing) {
      updateBoard(editing.id, { name: name.trim(), color, bgType, bgValue, musicUrl, musicName });
    } else {
      addBoard({ name: name.trim(), color, bgType, bgValue, musicUrl, musicName });
    }
    closeModal();
  }

  const bgOptions = bgType === 'gradient' ? BOARD_GRADIENTS : bgType === 'color' ? BOARD_SOLIDS : [];

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
        <div className="swatch-row">
          {BOARD_COLORS.map((c) => (
            <div key={c} className={`swatch ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      <div className="field">
        <label>Tipo de fondo</label>
        <div className="row-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {(['gradient', 'color', 'image'] as BoardBgType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`btn ${bgType === t ? 'btn-accent' : ''}`}
              onClick={() => {
                setBgType(t);
                setBgValue(t === 'gradient' ? BOARD_GRADIENTS[0] : t === 'color' ? BOARD_SOLIDS[0] : '');
              }}
            >
              {t === 'gradient' ? 'Degradado' : t === 'color' ? 'Color' : 'Imagen'}
            </button>
          ))}
        </div>
      </div>

      {bgType === 'image' ? (
        <div className="field">
          <label>URL de la imagen</label>
          <input type="url" value={bgValue} onChange={(e) => setBgValue(e.target.value)} placeholder="https://…" />
        </div>
      ) : (
        <div className="field">
          <label>Fondo</label>
          <div className="swatch-row">
            {bgOptions.map((v) => (
              <div
                key={v}
                className={`swatch ${bgValue === v ? 'active' : ''}`}
                style={{ background: v, borderRadius: 8, width: 44, height: 30 }}
                onClick={() => setBgValue(v)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label>Música por URL (opcional)</label>
        <input type="url" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="https://…" />
      </div>
    </Modal>
  );
}
