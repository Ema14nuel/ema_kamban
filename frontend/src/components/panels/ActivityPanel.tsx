import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { useLogStore } from '../../store/logStore';
import { STATUSES } from '../../types';
import { tint } from '../../lib/color';
import { formatShortDate } from '../../lib/date';
import './panels.css';

export default function ActivityPanel() {
  const focus = useUiStore((s) => s.focus);
  const focusTab = useUiStore((s) => s.focusTab);
  const setFocusTab = useUiStore((s) => s.setFocusTab);
  const closeFocus = useUiStore((s) => s.closeFocus);
  const findCard = useBoardStore((s) => s.findCard);
  const patchCard = useBoardStore((s) => s.patchCard);
  const moveCard = useBoardStore((s) => s.moveCard);
  const removeCard = useBoardStore((s) => s.removeCard);
  const log = useLogStore((s) => s.log);

  if (!focus) return null;
  const ref = findCard(focus.boardId, focus.cardId);
  if (!ref) return null;
  const { board, card, status } = ref;
  const sessions = log.filter((l) => l.cardId === card.id);

  return (
    <aside className="activity-panel slide-in">
      <div className="panel-strip" style={{ background: board.color }} />
      <div className="panel-head">
        <span className="panel-chip mono" style={{ color: board.color, background: tint(board.color, 0.16) }}>
          {board.name}
        </span>
        <span className="panel-chip mono">{card.pomos || 0} pomodoros</span>
        <button type="button" className="panel-close" onClick={closeFocus} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <textarea
        className="panel-title"
        value={card.title}
        onChange={(e) => patchCard(board.id, card.id, { title: e.target.value })}
        rows={2}
      />

      <div className="panel-tabs">
        <div className={`panel-tab ${focusTab === 'detail' ? 'active' : ''}`} onClick={() => setFocusTab('detail')}>
          Detalle
        </div>
        <div className={`panel-tab ${focusTab === 'pomodoros' ? 'active' : ''}`} onClick={() => setFocusTab('pomodoros')}>
          Pomodoros · {card.pomos || 0}
        </div>
      </div>

      {focusTab === 'detail' ? (
        <div className="panel-detail">
          <div className="panel-kanban">
            {STATUSES.map((s) => (
              <div
                key={s.key}
                className={`panel-kanban-item ${status === s.key ? 'active' : ''}`}
                style={{ boxShadow: status === s.key ? `0 0 0 2px ${s.color}` : undefined }}
                onClick={() => moveCard(board.id, card.id, s.key)}
              >
                <span className="column-dot" style={{ background: s.color }} />
                {s.title}
              </div>
            ))}
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea value={card.desc} onChange={(e) => patchCard(board.id, card.id, { desc: e.target.value })} rows={4} />
          </div>

          <div className="row-2">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={card.date} onChange={(e) => patchCard(board.id, card.id, { date: e.target.value })} />
            </div>
            <div className="field">
              <label>Hora</label>
              <input type="time" value={card.time} onChange={(e) => patchCard(board.id, card.id, { time: e.target.value })} />
            </div>
          </div>

          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeCard(board.id, card.id);
                closeFocus();
              }}
            >
              Eliminar actividad
            </button>
            <button type="button" className="btn btn-accent" onClick={closeFocus}>
              Listo
            </button>
          </div>
        </div>
      ) : (
        <div className="panel-pomos">
          <div className="panel-stats">
            <div className="panel-stat">
              <span className="panel-stat-value">{card.pomos || 0}</span>
              <span className="panel-stat-label mono">pomodoros</span>
            </div>
            <div className="panel-stat">
              <span className="panel-stat-value">{sessions.reduce((n, s) => n + s.minutes, 0)}</span>
              <span className="panel-stat-label mono">minutos de enfoque</span>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="panel-empty">Sin sesiones registradas todavía.</div>
          ) : (
            <div className="panel-session-list">
              {sessions.map((s) => (
                <div key={s.id} className="panel-session-row mono">
                  <span>{formatShortDate(new Date(s.at).toISOString().slice(0, 10))}</span>
                  <span>{s.minutes} min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
