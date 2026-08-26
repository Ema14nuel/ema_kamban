import { useEffect } from 'react';
import { useMascotStore } from '../../store/mascotStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SPRITES } from '../../types';
import './mascot.css';

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

  return (
    <div className="mascot-strip" style={{ right: panel ? 'min(380px,44vw)' : 0 }}>
      <div className="mascot-sprite" style={{ left: `${x}%`, transition: `left ${duration}s linear` }}>
        <div className={cheering ? 'mascot-anim cheer' : 'mascot-anim walk'} style={{ ['--flip' as string]: dir }}>
          {cheering && <div className="mascot-spark">🏆</div>}
          <img src={spriteDef.src} alt={spriteDef.name} />
        </div>
      </div>
    </div>
  );
}
