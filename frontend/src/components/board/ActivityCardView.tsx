import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ActivityCard } from '../../types';
import { medalOf } from '../../lib/medal';
import { formatShortDate } from '../../lib/date';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import './activityCard.css';

interface ActivityCardViewProps {
  boardId: string;
  card: ActivityCard;
  status: string;
  accentColor: string;
  /** Posición visible dentro de la columna (arriba hacia abajo). */
  position: number;
}

export default function ActivityCardView({ boardId, card, status, accentColor, position }: ActivityCardViewProps) {
  const removeCard = useBoardStore((s) => s.removeCard);
  const openFocus = useUiStore((s) => s.openFocus);
  const medal = medalOf(card, status);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { boardId, cardId: card.id, title: card.title, color: accentColor, medalColor: medal?.color },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `card:${card.id}` });

  return (
    <div
      ref={(node) => { setNodeRef(node); setDropRef(node); }}
      className={`activity-card card-fade ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drop-target' : ''}`}
      style={{ borderLeftColor: accentColor }}
      onClick={() => !isDragging && openFocus(boardId, card.id)}
      {...listeners}
      {...attributes}
    >
      <div className="activity-card-top">
        <span className="activity-order mono" title={`Actividad número ${position} en esta columna`}>
          {position}
        </span>
        {medal && (
          <span className="activity-medal" style={{ background: medal.color, boxShadow: `0 0 0 2px ${medal.shade}` }} title={medal.label} />
        )}
        <div className="activity-title">{card.title}</div>
        <button
          type="button"
          className="activity-remove"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`¿Borrar la actividad "${card.title}"?`)) removeCard(boardId, card.id);
          }}
          aria-label="Eliminar"
        >
          ✕
        </button>
      </div>
      {card.desc && <div className="activity-desc">{card.desc}</div>}
      <span className="activity-meta mono">
        {formatShortDate(card.date)}
        {card.time ? ` · ${card.time}` : ''}
      </span>
    </div>
  );
}
