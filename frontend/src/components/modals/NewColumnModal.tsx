import { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { BOARD_COLORS } from '../../types';
import Modal from '../common/Modal';
import ColorSwatchRow from '../common/ColorSwatchRow';

export default function NewColumnModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const addColumn = useBoardStore((s) => s.addColumn);

  const [title, setTitle] = useState('');
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!modal.boardId || !title.trim()) return;
    setSaving(true);
    await addColumn(modal.boardId, title.trim(), color);
    setSaving(false);
    closeModal();
  }

  return (
    <Modal
      title="Nueva columna"
      onClose={closeModal}
      footer={
        <>
          <button type="button" className="btn" onClick={closeModal}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" disabled={!title.trim() || saving} onClick={onSave}>
            {saving ? 'Creando…' : 'Crear'}
          </button>
        </>
      }
    >
      <p className="mono" style={{ margin: 0, fontSize: 12, color: 'var(--dim)' }}>
        Solo se ve en este tablero — no aparece en el Consolidado.
      </p>
      <div className="field">
        <label>Nombre</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la columna" autoFocus />
      </div>
      <div className="field">
        <label>Color</label>
        <ColorSwatchRow value={color} onChange={setColor} />
      </div>
    </Modal>
  );
}
