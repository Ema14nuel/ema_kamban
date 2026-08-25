import type { DragEvent } from 'react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { mmss } from '../../lib/date';
import type { PomodoroMode } from '../../types';
import './panels.css';

const MODES: { key: PomodoroMode; label: string }[] = [
  { key: 'focus', label: '25 min' },
  { key: 'short', label: '5 min' },
  { key: 'long', label: '15 min' },
];

export default function PomodoroPanel() {
  const pomo = usePomodoroStore();
  const setMode = usePomodoroStore((s) => s.setMode);
  const toggleRun = usePomodoroStore((s) => s.toggleRun);
  const reset = usePomodoroStore((s) => s.reset);
  const addTask = usePomodoroStore((s) => s.addTask);
  const removeTask = usePomodoroStore((s) => s.removeTask);
  const setActive = usePomodoroStore((s) => s.setActive);

  const closePanel = useUiStore((s) => s.closePanel);
  const dragCardId = useUiStore((s) => s.dragCardId);
  const setDragCard = useUiStore((s) => s.setDragCard);
  const mediaUrl = useUiStore((s) => s.mediaUrl);
  const mediaName = useUiStore((s) => s.mediaName);
  const setMedia = useUiStore((s) => s.setMedia);
  const openImmersive = useUiStore((s) => s.openImmersive);

  const findCard = useBoardStore((s) => s.findCard);

  const activeRef = pomo.activeKey ? findCard(pomo.tasks.find((t) => t.cardId === pomo.activeKey)?.boardId || '', pomo.activeKey) : null;
  const activeBoard = activeRef?.board;

  function onDropTask(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (dragCardId) addTask(dragCardId.boardId, dragCardId.cardId);
    setDragCard(null);
  }

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

      <div className="pomo-tasks" onDragOver={(e) => e.preventDefault()} onDrop={onDropTask}>
        <span className="panel-section-label">Tarea activa · arrastra una tarjeta aquí</span>
        {pomo.tasks.length === 0 && <div className="panel-empty">Sin tareas de enfoque.</div>}
        {pomo.tasks.map((t) => {
          const ref = findCard(t.boardId, t.cardId);
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
