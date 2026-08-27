import { useEffect, useState } from 'react';
import { useMascotStore } from '../../store/mascotStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SPRITES } from '../../types';
import './mascot.css';

const WALK_FRAME_MS = 160;
const JUMP_FRAME_MS = 150;

export default function Mascot() {
  const x = useMascotStore((s) => s.x);
  const dir = useMascotStore((s) => s.dir);
  const duration = useMascotStore((s) => s.duration);
  const cheering = useMascotStore((s) => s.cheering);
  const step = useMascotStore((s) => s.step);
  const sprite = useAuthStore((s) => s.user?.sprite) || 'chico';
  const panel = useUiStore((s) => s.panel);

  useEffect(() => {
    const id = setInterval(step, 3400);
    return () => clearInterval(id);
  }, [step]);

  const spriteDef = SPRITES.find((s) => s.k === sprite) || SPRITES[0];
  const frames = cheering ? spriteDef.jump : spriteDef.walk;

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
    if (!frames || frames.length < 2) return;
    const ms = cheering ? JUMP_FRAME_MS : WALK_FRAME_MS;
    const id = setInterval(() => setFrameIndex((i) => (i + 1) % frames.length), ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spriteDef.k, cheering]);

  const currentSrc = frames && frames.length > 0 ? frames[frameIndex % frames.length] : spriteDef.src;

  return (
    <div className="mascot-strip" style={{ right: panel ? 'min(380px,44vw)' : 0 }}>
      <div className="mascot-sprite" style={{ left: `${x}%`, transition: `left ${duration}s linear` }}>
        <div className={cheering ? 'mascot-anim cheer' : 'mascot-anim walk'} style={{ ['--flip' as string]: dir }}>
          {cheering && <div className="mascot-spark">🏆</div>}
          <img src={currentSrc} alt={spriteDef.name} />
        </div>
      </div>
    </div>
  );
}
