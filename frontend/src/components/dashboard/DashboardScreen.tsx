import { useMemo } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import { medalOf } from '../../lib/medal';
import { isCardVisibleToday } from '../../lib/schedule';
import { STATUSES } from '../../types';
import type { ActivityCard, Board } from '../../types';
import './dashboard.css';

interface AgendaEntry {
  card: ActivityCard;
  board: Board;
  status: string;
}

export default function DashboardScreen() {
  const boards = useBoardStore((s) => s.boards);
  const openFocus = useUiStore((s) => s.openFocus);

  const stats = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let unresolved = 0;
    const byStatus: Record<string, number> = {};
    for (const board of boards) {
      // Las columnas personalizadas de cada tablero no entran en este
      // resumen entre tableros, solo las 4 fijas.
      for (const col of board.columns.filter((c) => !c.isCustom)) {
        byStatus[col.status] = (byStatus[col.status] || 0) + col.cards.length;
        for (const card of col.cards) {
          if (col.status !== 'done') {
            unresolved += 1;
            continue;
          }
          const medal = medalOf(card, col.status);
          if (medal?.tier === 'oro') onTime += 1;
          else late += 1;
        }
      }
    }
    return { onTime, late, unresolved, byStatus };
  }, [boards]);

  const agenda = useMemo(() => {
    const entries: AgendaEntry[] = [];
    for (const board of boards) {
      for (const col of board.columns.filter((c) => !c.isCustom && c.status !== 'done')) {
        for (const card of col.cards) {
          if (isCardVisibleToday(card, col.status)) entries.push({ card, board, status: col.status });
        }
      }
    }
    entries.sort((a, b) => {
      if (!a.card.time && !b.card.time) return a.card.title.localeCompare(b.card.title);
      if (!a.card.time) return 1;
      if (!b.card.time) return -1;
      return a.card.time.localeCompare(b.card.time);
    });
    return entries;
  }, [boards]);

  return (
    <div className="dashboard-screen">
      <h1>Inicio</h1>
      <p className="mono">Resumen de actividades en todos los tableros.</p>

      <div className="dashboard-stats">
        <div className="dashboard-stat" style={{ borderTopColor: 'var(--medal-oro)' }}>
          <span className="dashboard-stat-value">{stats.onTime}</span>
          <span className="dashboard-stat-label">A tiempo</span>
        </div>
        <div className="dashboard-stat" style={{ borderTopColor: 'var(--medal-bronce)' }}>
          <span className="dashboard-stat-value">{stats.late}</span>
          <span className="dashboard-stat-label">Fuera de fecha</span>
        </div>
        <div className="dashboard-stat" style={{ borderTopColor: 'var(--status-pending)' }}>
          <span className="dashboard-stat-value">{stats.unresolved}</span>
          <span className="dashboard-stat-label">Sin resolver</span>
        </div>
      </div>

      <div className="dashboard-agenda">
        <div className="panel-section-label">Agenda de hoy</div>
        {agenda.length === 0 ? (
          <div className="dashboard-agenda-empty">No hay actividades pendientes para hoy.</div>
        ) : (
          <div className="dashboard-agenda-list">
            {agenda.map(({ card, board, status }) => {
              const statusDef = STATUSES.find((s) => s.key === status);
              return (
                <div key={card.id} className="dashboard-agenda-row" onClick={() => openFocus(board.id, card.id)}>
                  <span className="dashboard-agenda-time mono">{card.time || '--:--'}</span>
                  <span className="column-dot" style={{ background: statusDef?.color }} />
                  <div className="dashboard-agenda-info">
                    <span className="dashboard-agenda-title">{card.title}</span>
                    <span className="dashboard-agenda-board mono" style={{ color: board.color }}>
                      {board.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-breakdown">
        <div className="panel-section-label">Por estado</div>
        <div className="dashboard-breakdown-list">
          {STATUSES.map((s) => (
            <div key={s.key} className="dashboard-breakdown-row">
              <span className="column-dot" style={{ background: s.color }} />
              <span className="dashboard-breakdown-title">{s.title}</span>
              <span className="mono">{stats.byStatus[s.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
