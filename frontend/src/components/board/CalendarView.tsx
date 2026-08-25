import { useUiStore } from '../../store/uiStore';
import { toIso } from '../../lib/date';
import type { ActivityCard, Board } from '../../types';
import './calendarView.css';

interface CalendarEntry {
  card: ActivityCard;
  board: Board;
}

interface CalendarViewProps {
  entries: CalendarEntry[];
  onOpenCard: (boardId: string, cardId: string) => void;
}

const WEEK_DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export default function CalendarView({ entries, onOpenCard }: CalendarViewProps) {
  const month = useUiStore((s) => s.month);
  const shiftMonth = useUiStore((s) => s.shiftMonth);
  const monthDate = month ? new Date(month) : new Date();

  const year = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    if (!entry.card.date) continue;
    const list = byDate.get(entry.card.date) || [];
    list.push(entry);
    byDate.set(entry.card.date, list);
  }

  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, m, d) });

  const monthLabel = monthDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const todayIso = toIso(new Date());

  return (
    <div className="calendar-view">
      <div className="calendar-nav">
        <button type="button" onClick={() => shiftMonth(-1)}>
          ←
        </button>
        <span className="calendar-month-label">{monthLabel}</span>
        <button type="button" onClick={() => shiftMonth(1)}>
          →
        </button>
      </div>
      <div className="calendar-grid">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="calendar-weekday mono">
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className="calendar-cell empty" />;
          const iso = toIso(cell.date);
          const dayEntries = byDate.get(iso) || [];
          return (
            <div key={idx} className={`calendar-cell ${iso === todayIso ? 'today' : ''}`}>
              <span className="calendar-day-num mono">{cell.date.getDate()}</span>
              <div className="calendar-day-entries">
                {dayEntries.slice(0, 4).map((e) => (
                  <div
                    key={e.card.id}
                    className="calendar-entry"
                    style={{ background: `${e.board.color}22`, color: e.board.color }}
                    onClick={() => onOpenCard(e.board.id, e.card.id)}
                    title={e.card.title}
                  >
                    {e.card.title}
                  </div>
                ))}
                {dayEntries.length > 4 && <div className="calendar-entry-more mono">+{dayEntries.length - 4}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
