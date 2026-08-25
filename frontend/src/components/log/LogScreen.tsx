import { useLogStore } from '../../store/logStore';
import './log.css';

export default function LogScreen() {
  const log = useLogStore((s) => s.log);

  const groups = new Map<string, { title: string; boardName: string; color: string; minutes: number; count: number }>();
  for (const entry of log) {
    const g = groups.get(entry.cardId);
    if (g) {
      g.minutes += entry.minutes;
      g.count += 1;
    } else {
      groups.set(entry.cardId, { title: entry.title, boardName: entry.boardName, color: entry.color, minutes: entry.minutes, count: 1 });
    }
  }

  const rows = Array.from(groups.values());

  return (
    <div className="log-screen">
      <h1>Registro</h1>
      <p className="mono">Pomodoros completados por actividad.</p>

      {rows.length === 0 ? (
        <div className="log-empty">Aún no completas ningún pomodoro.</div>
      ) : (
        <div className="log-list">
          {rows.map((r) => (
            <div key={r.title + r.boardName} className="log-row card-fade">
              <div className="log-row-info">
                <span className="log-row-title">{r.title}</span>
                <span className="log-row-meta mono" style={{ color: r.color }}>
                  {r.boardName}
                </span>
              </div>
              <div className="log-row-dots">
                {Array.from({ length: r.count }).map((_, i) => (
                  <span key={i} className="log-dot" style={{ background: r.color }} />
                ))}
              </div>
              <span className="log-row-total mono">
                {r.count} pomodoros · {r.minutes} min
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
