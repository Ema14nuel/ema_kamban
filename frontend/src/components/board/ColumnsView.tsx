import { useDroppable } from '@dnd-kit/core';
import type { Board, Column, StatusKey } from '../../types';
import { STATUSES } from '../../types';
import { useUiStore } from '../../store/uiStore';
import ActivityCardView from './ActivityCardView';
import './columnsView.css';

interface ColumnsViewProps {
  board: Board;
}

interface DroppableColumnProps {
  boardId: string;
  status: StatusKey;
  title: string;
  color: string;
  column: Column | undefined;
}

function DroppableColumn({ boardId, status, title, color, column }: DroppableColumnProps) {
  const openModal = useUiStore((s) => s.openModal);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={`column ${isOver ? 'is-over' : ''}`} style={{ borderColor: isOver ? color : undefined }}>
      <div className="column-head" style={{ borderBottomColor: color }}>
        <span className="column-dot" style={{ background: color }} />
        <span className="column-title">{title}</span>
        <span className="column-count mono">{column?.cards.length || 0}</span>
        <button
          type="button"
          className="column-add"
          onClick={() => openModal({ kind: 'activity', boardId, status })}
          aria-label={`Añadir actividad en ${title}`}
        >
          +
        </button>
      </div>
      <div className="column-cards">
        {(column?.cards || []).map((card) => (
          <ActivityCardView key={card.id} boardId={boardId} card={card} status={status} accentColor={color} />
        ))}
        {(column?.cards.length || 0) === 0 && <div className="column-empty">Sin actividades</div>}
      </div>
    </div>
  );
}

export default function ColumnsView({ board }: ColumnsViewProps) {
  return (
    <div className="columns-view">
      {STATUSES.map((s) => (
        <DroppableColumn
          key={s.key}
          boardId={board.id}
          status={s.key}
          title={s.title}
          color={s.color}
          column={board.columns.find((c) => c.status === s.key)}
        />
      ))}
    </div>
  );
}
