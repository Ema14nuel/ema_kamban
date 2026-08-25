import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import { STATUSES } from '../../types';
import { tint } from '../../lib/color';
import ConsolidatedCard from './ConsolidatedCard';
import CalendarView from '../board/CalendarView';
import './consolidated.css';

export default function ConsolidatedScreen() {
  const boards = useBoardStore((s) => s.boards);
  const filter = useUiStore((s) => s.filter);
  const toggleBoardFilter = useUiStore((s) => s.toggleBoardFilter);
  const toggleAllBoardsFilter = useUiStore((s) => s.toggleAllBoardsFilter);
  const consolidatedView = useUiStore((s) => s.consolidatedView);
  const setConsolidatedView = useUiStore((s) => s.setConsolidatedView);
  const openFocus = useUiStore((s) => s.openFocus);

  const allBoardIds = boards.map((b) => b.id);
  const activeIds = filter ?? allBoardIds;
  const visibleBoards = boards.filter((b) => activeIds.includes(b.id));

  const allEntries = visibleBoards.flatMap((b) => b.columns.flatMap((c) => c.cards.map((card) => ({ card, board: b, status: c.status }))));
  const totalCount = allEntries.length;

  return (
    <div className="consolidated-screen">
      <div className="consolidated-sidebar">
        <span className="consolidated-sidebar-label">Tableros</span>
        <div className="consolidated-check-row" onClick={() => toggleAllBoardsFilter(allBoardIds)}>
          <span className={`consolidated-check ${filter === null ? 'on' : ''}`}>{filter === null ? '✓' : ''}</span>
          <span className="consolidated-check-text">Todas las actividades</span>
        </div>
        {boards.map((b) => {
          const on = activeIds.includes(b.id);
          const count = b.columns.reduce((n, c) => n + c.cards.length, 0);
          return (
            <div
              key={b.id}
              className="consolidated-check-row"
              style={{ background: on ? tint(b.color, 0.14) : 'transparent', borderColor: on ? tint(b.color, 0.4) : 'var(--border)' }}
              onClick={() => toggleBoardFilter(b.id, allBoardIds)}
            >
              <span className="consolidated-check" style={{ background: on ? b.color : 'transparent', borderColor: on ? b.color : 'var(--border)', color: '#fff' }}>
                {on ? '✓' : ''}
              </span>
              <span className="consolidated-check-text">{b.name}</span>
              <span className="consolidated-check-count mono">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="consolidated-main">
        <div className="consolidated-head">
          <div>
            <h1>Consolidado</h1>
            <p className="mono">
              {visibleBoards.length} tableros · {totalCount} actividades
            </p>
          </div>
          <div className="consolidated-view-tabs">
            <div className={`consolidated-view-tab ${consolidatedView === 'columns' ? 'active' : ''}`} onClick={() => setConsolidatedView('columns')}>
              Columnas
            </div>
            <div className={`consolidated-view-tab ${consolidatedView === 'calendar' ? 'active' : ''}`} onClick={() => setConsolidatedView('calendar')}>
              Calendario
            </div>
          </div>
        </div>

        {consolidatedView === 'columns' ? (
          <div className="consolidated-columns">
            {STATUSES.map((s) => {
              const entries = allEntries.filter((e) => e.status === s.key);
              return (
                <div key={s.key} className="consolidated-column">
                  <div className="consolidated-column-head" style={{ borderBottomColor: s.color }}>
                    <span className="column-dot" style={{ background: s.color }} />
                    <span className="column-title">{s.title}</span>
                    <span className="column-count mono">{entries.length}</span>
                  </div>
                  <div className="consolidated-column-cards">
                    {entries.map((e) => (
                      <ConsolidatedCard key={e.card.id} board={e.board} card={e.card} status={e.status} />
                    ))}
                    {entries.length === 0 && <div className="column-empty">Sin actividades</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <CalendarView entries={allEntries} onOpenCard={(bId, cardId) => openFocus(bId, cardId)} />
        )}
      </div>
    </div>
  );
}
