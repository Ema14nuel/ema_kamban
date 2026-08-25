import type { DragEvent } from 'react';
import type { ActivityCard, StatusKey } from '../../types';
import { medalOf } from '../../lib/medal';
import { formatShortDate } from '../../lib/date';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import './activityCard.css';

interface ActivityCardViewProps {
  boardId: string;
  card: ActivityCard;
  status: StatusKey;
  accentColor: string;
}

export default function ActivityCardView({ boardId, card, status, accentColor }: ActivityCardViewProps) {
  const removeCard = useBoardStore((s) => s.removeCard);
  const openFocus = useUiStore((s) => s.openFocus);
  const setDragCard = useUiStore((s) => s.setDragCard);
  const medal = medalOf(card, status);

  function onDragStart(e: DragEvent<HTMLDivElement>) {
    setDragCard({ boardId, cardId: card.id });
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className="activity-card card-fade"
      style={{ borderLeftColor: accentColor }}
      draggable
      onDragStart={onDragStart}
      onClick={() => openFocus(boardId, card.id)}
    >
      <div className="activity-card-top">
        {medal && (
          <span className="activity-medal" style={{ background: medal.color, boxShadow: `0 0 0 2px ${medal.shade}` }} title={medal.label} />
        )}
        <div className="activity-title">{card.title}</div>
        <button
          type="button"
          className="activity-remove"
          onClick={(e) => {
            e.stopPropagation();
            removeCard(boardId, card.id);
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
