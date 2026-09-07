import { useDroppable } from '@dnd-kit/core';
import type { Board, Column } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { isCardVisibleToday } from '../../lib/schedule';
import ActivityCardView from './ActivityCardView';
import './columnsView.css';

interface ColumnsViewProps {
  board: Board;
}

interface DroppableColumnProps {
  boardId: string;
  column: Column;
}

function DroppableColumn({ boardId, column }: DroppableColumnProps) {
  const openModal = useUiStore((s) => s.openModal);
  const removeColumn = useBoardStore((s) => s.removeColumn);
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const { status, title, color } = column;

  return (
    <div ref={setNodeRef} className={`column ${isOver ? 'is-over' : ''}`} style={{ borderColor: isOver ? color : undefined }}>
      <div className="column-head" style={{ borderBottomColor: color }}>
        <span className="column-dot" style={{ background: color }} />
        <span className="column-title">{title}</span>
        <span className="column-count mono">{column.cards.length}</span>
        {column.isCustom && (
          <button
            type="button"
            className="column-add"
            onClick={() => {
              if (confirm(`¿Borrar la columna "${title}"? Sus actividades vuelven a Pending.`)) {
                removeColumn(boardId, column.customColumnId as string);
              }
            }}
            aria-label={`Borrar columna ${title}`}
            title="Borrar columna"
          >
            ✕
          </button>
        )}
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
        {column.cards.map((card, index) => (
          <ActivityCardView key={card.id} boardId={boardId} card={card} status={status} accentColor={color} position={index + 1} />
        ))}
        {column.cards.length === 0 && <div className="column-empty">Sin actividades</div>}
      </div>
    </div>
  );
}

export default function ColumnsView({ board }: ColumnsViewProps) {
  const openModal = useUiStore((s) => s.openModal);

  // Actividades con fecha pasada y sin completar quedan "perdidas": se
  // sacan del tablero (se ven en Histórico → Actividades perdidas). Las
  // sin fecha y las completadas siempre se muestran.
  const visibleColumns = board.columns.map((c) => ({
    ...c,
    cards: c.cards.filter((card) => isCardVisibleToday(card, c.status)),
  }));

  return (
    <div className="columns-view">
      {visibleColumns.map((c) => (
        <DroppableColumn key={c.id} boardId={board.id} column={c} />
      ))}
      <div className="column-new" onClick={() => openModal({ kind: 'column', boardId: board.id })}>
        <div className="column-new-icon">+</div>
        <span>Nueva columna</span>
      </div>
    </div>
  );
}
