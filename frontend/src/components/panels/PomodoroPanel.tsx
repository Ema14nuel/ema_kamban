import { useDroppable } from '@dnd-kit/core';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { mmss } from '../../lib/date';
import type { Board, PomodoroMode } from '../../types';
import './panels.css';

const MODES: { key: PomodoroMode; label: string }[] = [
  { key: 'focus', label: 'Enfoque' },
  { key: 'short', label: 'Corto' },
  { key: 'long', label: 'Largo' },
];

const DURATION_STEP = 5;

function findCardIn(boards: Board[], boardId: string, cardId: string) {
  const board = boards.find((b) => b.id === boardId);
  if (!board) return null;
  for (const col of board.columns) {
    const card = col.cards.find((k) => k.id === cardId);
    if (card) return { board, card };
  }
  return null;
}

export default function PomodoroPanel() {
  const pomo = usePomodoroStore();
  const setMode = usePomodoroStore((s) => s.setMode);
  const setDuration = usePomodoroStore((s) => s.setDuration);
  const toggleRun = usePomodoroStore((s) => s.toggleRun);
  const reset = usePomodoroStore((s) => s.reset);
  const removeTask = usePomodoroStore((s) => s.removeTask);
  const setActive = usePomodoroStore((s) => s.setActive);

  const closePanel = useUiStore((s) => s.closePanel);
  const mediaUrl = useUiStore((s) => s.mediaUrl);
  const mediaName = useUiStore((s) => s.mediaName);
  const setMedia = useUiStore((s) => s.setMedia);
  const openImmersive = useUiStore((s) => s.openImmersive);

  const boards = useBoardStore((s) => s.boards);
  const { setNodeRef, isOver } = useDroppable({ id: 'pomodoro-dropzone' });

  const activeRef = pomo.activeKey ? findCardIn(boards, pomo.tasks.find((t) => t.cardId === pomo.activeKey)?.boardId || '', pomo.activeKey) : null;
  const activeBoard = activeRef?.board;
  const currentMinutes = Math.round(pomo.durations[pomo.mode] / 60);

  return (
    <aside className="pomodoro-panel slide-in">
      <div className="panel-head">
        <span className="panel-chip mono">Pomodoro</span>
        <button type="button" className="panel-close" onClick={closePanel} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="pomo-modes">
        {MODES.map((m) => (
          <button key={m.key} type="button" className={pomo.mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="pomo-duration-adjust">
        <button
          type="button"
          disabled={pomo.running || currentMinutes <= 1}
          onClick={() => setDuration(pomo.mode, currentMinutes - DURATION_STEP)}
          aria-label="Reducir duración"
        >
          −
        </button>
        <span className="mono">{currentMinutes} min</span>
        <button type="button" disabled={pomo.running} onClick={() => setDuration(pomo.mode, currentMinutes + DURATION_STEP)} aria-label="Aumentar duración">
          +
        </button>
      </div>

      <div className="pomo-timer mono">{mmss(pomo.left)}</div>
      <p className="pomo-status">
        {pomo.running ? 'En marcha' : 'En pausa'} · Ronda {pomo.round}
      </p>

      <div className="pomo-controls">
        <button type="button" className="btn btn-accent" onClick={toggleRun}>
          {pomo.running ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reiniciar
        </button>
        <button type="button" className="btn" onClick={openImmersive}>
          Inmersivo
        </button>
      </div>

      <div ref={setNodeRef} className={`pomo-tasks ${isOver ? 'is-over' : ''}`}>
        <span className="panel-section-label">Tarea activa · arrastra una tarjeta aquí</span>
        {pomo.tasks.length === 0 && <div className="panel-empty">Sin tareas de enfoque.</div>}
        {pomo.tasks.map((t) => {
          const ref = findCardIn(boards, t.boardId, t.cardId);
          if (!ref) return null;
          return (
            <div key={t.cardId} className={`pomo-task ${pomo.activeKey === t.cardId ? 'active' : ''}`} onClick={() => setActive(t.cardId)}>
              <span className="column-dot" style={{ background: ref.board.color }} />
              <span className="pomo-task-title">{ref.card.title}</span>
              <button
                type="button"
                className="activity-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTask(t.cardId);
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {activeBoard?.musicUrl && (
        <div className="pomo-music">
          <span className="panel-section-label">Música del tablero</span>
          <audio controls src={activeBoard.musicUrl} style={{ width: '100%' }} />
        </div>
      )}

      <div className="pomo-immersive-block">
        <span className="panel-section-label">Modo inmersivo</span>
        <input
          type="url"
          placeholder="URL de YouTube o video"
          value={mediaUrl}
          onChange={(e) => setMedia(e.target.value, e.target.value ? 'enlace' : 'ninguno')}
        />
        <span className="mono pomo-media-name">Archivo: {mediaName}</span>
      </div>
    </aside>
  );
}
