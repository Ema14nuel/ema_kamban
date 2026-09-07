import { useEffect, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import Select2 from '../common/Select2';
import Modal from '../common/Modal';

export default function NewActivityModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const boards = useBoardStore((s) => s.boards);
  const addCard = useBoardStore((s) => s.addCard);

  const [boardId, setBoardId] = useState<string | null>(modal.boardId ?? null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<string>(modal.status || 'pending');

  const boardOptions = boards.map((b) => ({ id: b.id, label: b.name, color: b.color }));
  const selectedBoard = boards.find((b) => b.id === boardId);

  // Si se cambia de tablero (o el actual no tiene esa columna, p. ej. una
  // personalizada de otro tablero), volver a la primera columna disponible.
  useEffect(() => {
    if (!selectedBoard) return;
    if (!selectedBoard.columns.some((c) => c.status === status)) {
      setStatus(selectedBoard.columns[0]?.status || 'pending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  async function onSave() {
    if (!boardId || !title.trim()) return;
    const created = await addCard(boardId, { title: title.trim(), desc, date, time, status });
    if (created) {
      useUiStore.getState().openModal({ kind: 'success', message: 'La actividad fija se creó correctamente.' });
    }
  }

  return (
    <Modal
      title="Nueva actividad"
      onClose={closeModal}
      footer={
        <>
          <button type="button" className="btn" onClick={closeModal}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" disabled={!boardId || !title.trim()} onClick={onSave}>
            Crear
          </button>
        </>
      }
    >
      <div className="field">
        <label>Tablero</label>
        <Select2 options={boardOptions} value={boardId} onChange={setBoardId} placeholder="Elegir tablero" />
      </div>
      <div className="field">
        <label>Nombre</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la actividad" />
      </div>
      <div className="field">
        <label>Descripción</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
      </div>
      <div className="row-2">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!selectedBoard}>
          {(selectedBoard?.columns ?? []).map((c) => (
            <option key={c.id} value={c.status}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
