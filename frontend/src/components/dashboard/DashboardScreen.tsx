import { useMemo } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { medalOf } from '../../lib/medal';
import { STATUSES } from '../../types';
import './dashboard.css';

export default function DashboardScreen() {
  const boards = useBoardStore((s) => s.boards);

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
