import type { ActivityCard, Board } from '../../types';
import { medalOf } from '../../lib/medal';
import { formatShortDate } from '../../lib/date';
import { tint } from '../../lib/color';
import { useUiStore } from '../../store/uiStore';
import '../board/activityCard.css';

interface ConsolidatedCardProps {
  board: Board;
  card: ActivityCard;
  status: string;
}

export default function ConsolidatedCard({ board, card, status }: ConsolidatedCardProps) {
  const openFocus = useUiStore((s) => s.openFocus);
  const medal = medalOf(card, status);

  return (
    <div className="activity-card card-fade" style={{ borderLeftColor: board.color }} onClick={() => openFocus(board.id, card.id)}>
      <span className="activity-meta mono" style={{ background: tint(board.color, 0.16), color: board.color, alignSelf: 'flex-start' }}>
        {board.name}
      </span>
      <div className="activity-card-top">
        {medal && <span className="activity-medal" style={{ background: medal.color, boxShadow: `0 0 0 2px ${medal.shade}` }} title={medal.label} />}
        <div className="activity-title">{card.title}</div>
      </div>
      {card.desc && <div className="activity-desc">{card.desc}</div>}
      <span className="activity-meta mono">
        {formatShortDate(card.date)}
        {card.time ? ` · ${card.time}` : ''}
      </span>
    </div>
  );
}
