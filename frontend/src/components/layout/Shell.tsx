import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import Navbar from './Navbar';
import Mascot from '../mascot/Mascot';
import ActivityPanel from '../panels/ActivityPanel';
import PomodoroPanel from '../panels/PomodoroPanel';
import ImmersiveMode from '../immersive/ImmersiveMode';
import ModalsRoot from '../modals/ModalsRoot';
import Fab from '../common/Fab';
import DragCardPreview from '../board/DragCardPreview';
import { useUiStore } from '../../store/uiStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useBoardStore } from '../../store/boardStore';
import { useRoutineStore } from '../../store/routineStore';
import { useLogStore } from '../../store/logStore';
import type { CardDragData } from '../board/dnd';

export default function Shell() {
  const location = useLocation();
  const panel = useUiStore((s) => s.panel);
  const immersive = useUiStore((s) => s.immersive);
  const openModal = useUiStore((s) => s.openModal);
  const activeBoardId = useUiStore((s) => s.activeBoardId);
  const tick = usePomodoroStore((s) => s.tick);
  const boards = useBoardStore((s) => s.boards);
  const moveCard = useBoardStore((s) => s.moveCard);
  const fetchBoards = useBoardStore((s) => s.fetchBoards);
  const fetchRoutines = useRoutineStore((s) => s.fetchRoutines);
  const fetchLog = useLogStore((s) => s.fetchLog);
  const addPomodoroTask = usePomodoroStore((s) => s.addTask);

  const [activeCard, setActiveCard] = useState<CardDragData | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    fetchBoards();
    fetchRoutines();
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBoardScreen = /^\/boards\/[^/]+/.test(location.pathname);

  function onDragStart(event: DragStartEvent) {
    setActiveCard(event.active.data.current as CardDragData);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const data = event.active.data.current as CardDragData | undefined;
    const overId = event.over?.id;
    if (!data || !overId) return;
    if (overId === 'pomodoro-dropzone') {
      addPomodoroTask(data.boardId, data.cardId);
    } else {
      const board = boards.find((b) => b.id === data.boardId);
      if (board?.columns.some((c) => c.status === overId)) {
        moveCard(data.boardId, data.cardId, String(overId));
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveCard(null)}>
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
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeCard && <DragCardPreview data={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}
