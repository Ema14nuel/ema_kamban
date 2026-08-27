import { useEffect, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { useLogStore } from '../../store/logStore';
import type { CardNote } from '../../types';
import { tint } from '../../lib/color';
import { formatShortDate, formatDateTime } from '../../lib/date';
import './panels.css';

export default function ActivityPanel() {
  const focus = useUiStore((s) => s.focus);
  const focusTab = useUiStore((s) => s.focusTab);
  const setFocusTab = useUiStore((s) => s.setFocusTab);
  const closeFocus = useUiStore((s) => s.closeFocus);
  const boards = useBoardStore((s) => s.boards);
  const patchCard = useBoardStore((s) => s.patchCard);
  const moveCard = useBoardStore((s) => s.moveCard);
  const removeCard = useBoardStore((s) => s.removeCard);
  const fetchCardNotes = useBoardStore((s) => s.fetchCardNotes);
  const addCardNote = useBoardStore((s) => s.addCardNote);
  const log = useLogStore((s) => s.log);

  const board = boards.find((b) => b.id === focus?.boardId);
  const column = board?.columns.find((c) => c.cards.some((k) => k.id === focus?.cardId));
  const card = column?.cards.find((k) => k.id === focus?.cardId);

  const [notes, setNotes] = useState<CardNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    if (!card) return;
    let cancelled = false;
    setNotesLoading(true);
    setNoteText('');
    fetchCardNotes(card.id).then((data) => {
      if (!cancelled) {
        setNotes(data);
        setNotesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (!focus || !board || !column || !card) return null;
  const status = column.status;
  const sessions = log.filter((l) => l.cardId === card.id);

  async function onAddNote() {
    if (!card) return;
    const text = noteText.trim();
    if (!text) return;
    const note = await addCardNote(card.id, text);
    if (note) {
      setNotes((prev) => [note, ...prev]);
      setNoteText('');
    }
  }

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
            {board.columns.map((c) => (
              <div
                key={c.id}
                className={`panel-kanban-item ${status === c.status ? 'active' : ''}`}
                style={{ boxShadow: status === c.status ? `0 0 0 2px ${c.color}` : undefined }}
                onClick={() => moveCard(board.id, card.id, c.status)}
              >
                <span className="column-dot" style={{ background: c.color }} />
                {c.title}
              </div>
            ))}
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea value={card.desc} onChange={(e) => patchCard(board.id, card.id, { desc: e.target.value })} rows={4} />
          </div>

          <div className="field">
            <label>Notas</label>
            <div className="panel-note-add">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Agregar una nota…"
                rows={2}
              />
              <button type="button" className="btn btn-accent" disabled={!noteText.trim()} onClick={onAddNote}>
                Agregar
              </button>
            </div>
            {notesLoading ? (
              <div className="panel-empty">Cargando…</div>
            ) : notes.length === 0 ? (
              <div className="panel-empty">Sin notas todavía.</div>
            ) : (
              <div className="panel-note-list">
                {notes.map((n) => (
                  <div key={n.id} className="panel-note-row">
                    <span className="panel-note-at mono">{formatDateTime(n.createdAt)}</span>
                    <p className="panel-note-text">{n.text}</p>
                  </div>
                ))}
              </div>
            )}
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
                if (!confirm(`¿Borrar la actividad "${card.title}"?`)) return;
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
