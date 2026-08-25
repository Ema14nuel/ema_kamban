import { useUiStore } from '../../store/uiStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { mmss } from '../../lib/date';
import { ytId } from '../../lib/youtube';
import type { PomodoroMode } from '../../types';
import './immersive.css';

const MODES: { key: PomodoroMode; label: string }[] = [
  { key: 'focus', label: '25' },
  { key: 'short', label: '5' },
  { key: 'long', label: '15' },
];

export default function ImmersiveMode() {
  const closeImmersive = useUiStore((s) => s.closeImmersive);
  const mediaUrl = useUiStore((s) => s.mediaUrl);
  const pomo = usePomodoroStore();
  const setMode = usePomodoroStore((s) => s.setMode);
  const toggleRun = usePomodoroStore((s) => s.toggleRun);

  const yt = ytId(mediaUrl);

  return (
    <div className="immersive-layer">
      {yt ? (
        <iframe
          className="immersive-media"
          src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=0&controls=0&loop=1&playlist=${yt}`}
          title="Video de fondo"
          allow="autoplay; encrypted-media"
        />
      ) : mediaUrl ? (
        <video className="immersive-media" src={mediaUrl} autoPlay loop muted playsInline />
      ) : (
        <div className="immersive-media immersive-fallback" />
      )}

      <div className="immersive-veil" />

      <button type="button" className="immersive-close" onClick={closeImmersive} aria-label="Cerrar modo inmersivo">
        ✕
      </button>

      <div className="immersive-card pop-in">
        <div className="pomo-modes">
          {MODES.map((m) => (
            <button key={m.key} type="button" className={pomo.mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>
              {m.label} min
            </button>
          ))}
        </div>
        <div className="immersive-timer mono">{mmss(pomo.left)}</div>
        <p className="immersive-round">Ronda {pomo.round}</p>
        <button type="button" className="btn btn-accent" onClick={toggleRun}>
          {pomo.running ? 'Pausar' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
}
