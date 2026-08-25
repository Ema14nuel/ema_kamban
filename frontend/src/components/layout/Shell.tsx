import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Mascot from '../mascot/Mascot';
import ActivityPanel from '../panels/ActivityPanel';
import PomodoroPanel from '../panels/PomodoroPanel';
import ImmersiveMode from '../immersive/ImmersiveMode';
import ModalsRoot from '../modals/ModalsRoot';
import Fab from '../common/Fab';
import { useUiStore } from '../../store/uiStore';
import { usePomodoroStore } from '../../store/pomodoroStore';

export default function Shell() {
  const location = useLocation();
  const panel = useUiStore((s) => s.panel);
  const immersive = useUiStore((s) => s.immersive);
  const openModal = useUiStore((s) => s.openModal);
  const activeBoardId = useUiStore((s) => s.activeBoardId);
  const tick = usePomodoroStore((s) => s.tick);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const onBoardScreen = /^\/boards\/[^/]+/.test(location.pathname);

  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
      {onBoardScreen && <Mascot />}
      {panel === 'focus' && <ActivityPanel />}
      {panel === 'pomodoro' && <PomodoroPanel />}
      {immersive && <ImmersiveMode />}
      <ModalsRoot />
      <Fab onClick={() => openModal({ kind: 'activity', boardId: activeBoardId })} />
    </div>
  );
}
