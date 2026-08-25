import type { DragEvent } from 'react';
import type { Board, StatusKey } from '../../types';
import { STATUSES } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import ActivityCardView from './ActivityCardView';
import './columnsView.css';

interface ColumnsViewProps {
  board: Board;
}

export default function ColumnsView({ board }: ColumnsViewProps) {
  const moveCard = useBoardStore((s) => s.moveCard);
  const dragCardId = useUiStore((s) => s.dragCardId);
  const setDragCard = useUiStore((s) => s.setDragCard);
  const openModal = useUiStore((s) => s.openModal);

  function onDrop(e: DragEvent<HTMLDivElement>, status: StatusKey) {
    e.preventDefault();
    if (dragCardId && dragCardId.boardId === board.id) {
      moveCard(board.id, dragCardId.cardId, status);
    }
    setDragCard(null);
  }

  return (
    <div className="columns-view">
      {STATUSES.map((s) => {
        const col = board.columns.find((c) => c.status === s.key);
        return (
          <div key={s.key} className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, s.key)}>
            <div className="column-head" style={{ borderBottomColor: s.color }}>
              <span className="column-dot" style={{ background: s.color }} />
              <span className="column-title">{s.title}</span>
              <span className="column-count mono">{col?.cards.length || 0}</span>
              <button
                type="button"
                className="column-add"
                onClick={() => openModal({ kind: 'activity', boardId: board.id, status: s.key })}
                aria-label={`Añadir actividad en ${s.title}`}
              >
                +
              </button>
            </div>
            <div className="column-cards">
              {(col?.cards || []).map((card) => (
                <ActivityCardView key={card.id} boardId={board.id} card={card} status={s.key} accentColor={board.color} />
              ))}
              {(col?.cards.length || 0) === 0 && <div className="column-empty">Sin actividades</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
