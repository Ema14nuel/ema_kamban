import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useBoardStore } from '../../store/boardStore';
import { useLogStore } from '../../store/logStore';
import { STATUSES, type CardEvent } from '../../types';
import { medalOf } from '../../lib/medal';
import { formatIsoDateTimeShort, formatShortDate, formatDateTime } from '../../lib/date';
import { tint } from '../../lib/color';
import './history.css';

interface ActivityDetailModalProps {
  boardId: string;
  cardId: string;
  onClose: () => void;
}

interface TraceItem {
  id: string;
  at: number;
  label: string;
  detail?: string;
}

const EVENT_LABELS: Record<CardEvent['action'], string> = {
  created: 'Creada',
  edited: 'Editada',
  moved: 'Movida de columna',
};

export default function ActivityDetailModal({ boardId, cardId, onClose }: ActivityDetailModalProps) {
  const boards = useBoardStore((s) => s.boards);
  const fetchCardHistory = useBoardStore((s) => s.fetchCardHistory);
  const log = useLogStore((s) => s.log);
  const [events, setEvents] = useState<CardEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    fetchCardHistory(cardId).then((data) => {
      if (!cancelled) setEvents(data);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId, fetchCardHistory]);

  const board = boards.find((b) => b.id === boardId);
  const hit = board?.columns
    .map((col) => ({ col, card: col.cards.find((c) => c.id === cardId) }))
    .find((x) => x.card);
  const card = hit?.card;
  const status = hit?.col.status;

  if (!board || !card || !status) {
    return (
      <Modal title="Actividad" onClose={onClose} width={720}>
        <p className="mono">No se encontró la actividad.</p>
      </Modal>
    );
  }

  const medal = medalOf(card, status);
  const statusDef = STATUSES.find((s) => s.key === status);
  const sessions = log.filter((l) => l.cardId === cardId);

  const trace: TraceItem[] = [
    ...(events ?? []).map((e) => ({ id: `ev-${e.id}`, at: e.at, label: EVENT_LABELS[e.action], detail: e.detail })),
    ...sessions.map((s) => ({ id: `pomo-${s.id}`, at: s.at, label: 'Pomodoro completado', detail: `${s.minutes} min` })),
  ].sort((a, b) => b.at - a.at);

  return (
    <Modal title={card.title} onClose={onClose} width={720}>
      <div className="activity-detail">
        <div className="activity-detail-chips">
          <span className="panel-chip mono" style={{ color: board.color, background: tint(board.color, 0.16) }}>
            {board.name}
          </span>
          {statusDef && (
            <span className="panel-chip mono" style={{ color: statusDef.color, background: tint(statusDef.color, 0.16) }}>
              {statusDef.title}
            </span>
          )}
          {medal && (
            <span className="activity-medal" style={{ background: medal.color, boxShadow: `0 0 0 2px ${medal.shade}` }} title={medal.label} />
          )}
        </div>

        <div className="activity-detail-stats">
          <div className="panel-stat">
            <span className="panel-stat-value activity-detail-stat-value mono">{formatIsoDateTimeShort(card.createdAt) || '—'}</span>
            <span className="panel-stat-label">Creada</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat-value activity-detail-stat-value mono">
              {card.date ? formatShortDate(card.date) : '—'}
              {card.time ? ` · ${card.time}` : ''}
            </span>
            <span className="panel-stat-label">Programada</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat-value activity-detail-stat-value mono">{card.doneAt ? formatShortDate(card.doneAt) : 'Pendiente'}</span>
            <span className="panel-stat-label">Finalización</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat-value">{card.pomos || 0}</span>
            <span className="panel-stat-label">Pomodoros</span>
          </div>
        </div>

        {card.desc && (
          <div className="field">
            <label>Descripción</label>
            <p className="activity-detail-desc">{card.desc}</p>
          </div>
        )}

        <div className="panel-section-label">Traza de actividad</div>
        {events === null ? (
          <div className="panel-empty">Cargando…</div>
        ) : trace.length === 0 ? (
          <div className="panel-empty">Sin eventos registrados todavía.</div>
        ) : (
          <div className="activity-trace">
            {trace.map((t) => (
              <div key={t.id} className="activity-trace-row">
                <span className="activity-trace-dot" />
                <div className="activity-trace-body">
                  <div className="activity-trace-top">
                    <span className="activity-trace-label">{t.label}</span>
                    <span className="activity-trace-at mono">{formatDateTime(t.at)}</span>
                  </div>
                  {t.detail && <span className="activity-trace-detail">{t.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
