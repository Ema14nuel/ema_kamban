import { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { formatIsoDateTimeShort, formatShortDate } from '../../lib/date';
import { isCardMissed } from '../../lib/schedule';
import { STATUSES } from '../../types';
import ActivityDetailModal from './ActivityDetailModal';
import './history.css';

interface HistoryRow {
  boardId: string;
  boardName: string;
  boardColor: string;
  cardId: string;
  title: string;
  status: string;
  createdAt?: string;
  doneAt?: string;
  missed: boolean;
}

type TabKey = 'all' | 'missed' | (typeof STATUSES)[number]['key'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todas las actividades' },
  ...STATUSES.map((s) => ({ key: s.key as TabKey, label: s.title })),
  { key: 'missed', label: 'Actividades perdidas' },
];

const EMPTY_MESSAGES: Record<TabKey, string> = {
  all: 'Todavía no hay actividades.',
  pending: 'No hay actividades en Pending.',
  progress: 'No hay actividades en In Progress.',
  waiting: 'No hay actividades en Waiting.',
  done: 'No hay actividades completadas.',
  missed: 'No hay actividades perdidas.',
};

export default function ActivitiesHistoryScreen() {
  const boards = useBoardStore((s) => s.boards);
  const rescheduleCard = useBoardStore((s) => s.rescheduleCard);
  const [tab, setTab] = useState<TabKey>('all');
  const [selected, setSelected] = useState<{ boardId: string; cardId: string } | null>(null);

  const allRows: HistoryRow[] = boards
    .flatMap((b) =>
      b.columns.flatMap((c) =>
        c.cards.map(
          (card): HistoryRow => ({
            boardId: b.id,
            boardName: b.name,
            boardColor: b.color,
            cardId: card.id,
            title: card.title,
            status: c.status,
            createdAt: card.createdAt,
            doneAt: card.doneAt,
            missed: isCardMissed(card, c.status),
          }),
        ),
      ),
    )
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const rows =
    tab === 'all'
      ? allRows
      : tab === 'missed'
        ? allRows.filter((r) => r.missed)
        : allRows.filter((r) => r.status === tab && !r.missed);

  async function reprogram(row: HistoryRow) {
    const newDate = prompt('Nueva fecha para esta actividad (AAAA-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!newDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert('Usa el formato AAAA-MM-DD.');
      return;
    }
    await rescheduleCard(row.boardId, row.cardId, newDate);
  }

  return (
    <div className="history-screen">
      <h1>Histórico de actividades</h1>
      <p className="mono">{rows.length} actividades{tab === 'all' ? ' en todos los tableros' : ''}.</p>

      <div className="history-tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`history-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="log-empty">{EMPTY_MESSAGES[tab]}</div>
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
                {r.missed && (
                  <button type="button" className="btn" onClick={() => reprogram(r)}>
                    Reprogramar
                  </button>
                )}
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
