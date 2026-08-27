import { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { formatIsoDateTimeShort, formatShortDate } from '../../lib/date';
import ActivityDetailModal from './ActivityDetailModal';
import './history.css';

interface HistoryRow {
  boardId: string;
  boardName: string;
  boardColor: string;
  cardId: string;
  title: string;
  createdAt?: string;
  doneAt?: string;
}

export default function ActivitiesHistoryScreen() {
  const boards = useBoardStore((s) => s.boards);
  const [selected, setSelected] = useState<{ boardId: string; cardId: string } | null>(null);

  const rows: HistoryRow[] = boards
    .flatMap((b) =>
      b.columns.flatMap((c) =>
        c.cards.map(
          (card): HistoryRow => ({
            boardId: b.id,
            boardName: b.name,
            boardColor: b.color,
            cardId: card.id,
            title: card.title,
            createdAt: card.createdAt,
            doneAt: card.doneAt,
          }),
        ),
      ),
    )
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="history-screen">
      <h1>Histórico de actividades</h1>
      <p className="mono">{rows.length} actividades en todos los tableros.</p>

      {rows.length === 0 ? (
        <div className="log-empty">Todavía no hay actividades.</div>
      ) : (
        <div className="history-table">
          <div className="history-row history-row-head mono">
            <span>ID</span>
            <span>Tablero</span>
            <span>Nombre</span>
            <span>Fecha inicio</span>
            <span>Fecha finalización</span>
            <span />
          </div>
          {rows.map((r) => (
            <div key={r.cardId} className="history-row">
              <span className="mono">{r.cardId}</span>
              <span className="history-board">
                <span className="history-dot" style={{ background: r.boardColor }} />
                {r.boardName}
              </span>
              <span className="history-title">{r.title}</span>
              <span className="mono">{formatIsoDateTimeShort(r.createdAt) || '—'}</span>
              <span className="mono">{r.doneAt ? formatShortDate(r.doneAt) : '—'}</span>
              <span className="history-actions">
                <button type="button" className="btn" onClick={() => setSelected({ boardId: r.boardId, cardId: r.cardId })}>
                  Ver
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ActivityDetailModal boardId={selected.boardId} cardId={selected.cardId} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
