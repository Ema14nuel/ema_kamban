import type { ActivityCard, Board } from '../../types';
import { medalOf } from '../../lib/medal';
import { formatShortDate } from '../../lib/date';
import { overdueDays } from '../../lib/schedule';
import { tint } from '../../lib/color';
import { useUiStore } from '../../store/uiStore';
import '../board/activityCard.css';

interface ConsolidatedCardProps {
  board: Board;
  card: ActivityCard;
  status: string;
  compact?: boolean;
}

export default function ConsolidatedCard({ board, card, status, compact }: ConsolidatedCardProps) {
  const openFocus = useUiStore((s) => s.openFocus);
  const medal = medalOf(card, status);
  const daysOverdue = overdueDays(card, status);

  return (
    <div
      className={`activity-card card-fade ${daysOverdue > 0 ? 'is-overdue' : ''} ${compact ? 'is-compact' : ''}`}
      style={{ borderLeftColor: board.color }}
      onClick={() => openFocus(board.id, card.id)}
      title={compact ? card.title : undefined}
    >
      <span className="activity-meta mono" style={{ background: tint(board.color, 0.16), color: board.color, alignSelf: 'flex-start' }}>
        {board.name}
      </span>
      <div className="activity-card-top">
        {medal && <span className="activity-medal" style={{ background: medal.color, boxShadow: `0 0 0 2px ${medal.shade}` }} title={medal.label} />}
        <div className="activity-title">{card.title}</div>
      </div>
      {!compact && card.desc && <div className="activity-desc">{card.desc}</div>}
      {daysOverdue > 0 && <span className="activity-overdue">{daysOverdue} {daysOverdue === 1 ? 'día vencido' : 'días vencidos'}</span>}
      {!compact && (
        <span className="activity-meta mono">
          {formatShortDate(card.date)}
          {card.time ? ` · ${card.time}` : ''}
        </span>
      )}
    </div>
  );
}
