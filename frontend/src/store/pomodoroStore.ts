import { create } from 'zustand';
import type { PomodoroMode, PomodoroTask } from '../types';
import { POMODORO_DURATIONS } from '../types';
import { useBoardStore } from './boardStore';
import { useLogStore } from './logStore';

interface PomodoroStoreState {
  mode: PomodoroMode;
  left: number;
  running: boolean;
  round: number;
  tasks: PomodoroTask[];
  activeKey: string | null;

  setMode: (mode: PomodoroMode) => void;
  toggleRun: () => void;
  reset: () => void;
  tick: () => void;
  addTask: (boardId: string, cardId: string) => void;
  removeTask: (cardId: string) => void;
  setActive: (cardId: string | null) => void;
}

export const usePomodoroStore = create<PomodoroStoreState>()((set, get) => ({
  mode: 'focus',
  left: POMODORO_DURATIONS.focus,
  running: false,
  round: 1,
  tasks: [],
  activeKey: null,

  setMode: (mode) => set({ mode, left: POMODORO_DURATIONS[mode], running: false }),

  toggleRun: () =>
    set((s) => ({ running: !s.running, left: s.left <= 0 ? POMODORO_DURATIONS[s.mode] : s.left })),

  reset: () => set((s) => ({ left: POMODORO_DURATIONS[s.mode], running: false })),

  tick: () => {
    const s = get();
    if (!s.running || s.left <= 0) return;
    const left = s.left - 1;
    if (left > 0) {
      set({ left });
      return;
    }
    const finishedFocus = s.mode === 'focus';
    set({ left: 0, running: false, round: finishedFocus ? s.round + 1 : s.round });
    if (finishedFocus) {
      const active = s.activeKey ? s.tasks.find((t) => t.cardId === s.activeKey) : null;
      if (active) {
        const ref = useBoardStore.getState().findCard(active.boardId, active.cardId);
        if (ref) {
          useBoardStore.getState().patchCard(active.boardId, active.cardId, { pomos: (ref.card.pomos || 0) + 1 });
          useLogStore.getState().addEntry({
            cardId: active.cardId,
            boardId: active.boardId,
            title: ref.card.title,
            boardName: ref.board.name,
            color: ref.board.color,
            minutes: Math.round(POMODORO_DURATIONS.focus / 60),
            at: Date.now(),
          });
        }
      }
    }
  },

  addTask: (boardId, cardId) =>
    set((s) => (s.tasks.some((t) => t.cardId === cardId) ? s : { tasks: s.tasks.concat({ boardId, cardId }), activeKey: s.activeKey ?? cardId })),

  removeTask: (cardId) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.cardId !== cardId),
      activeKey: s.activeKey === cardId ? null : s.activeKey,
    })),

  setActive: (cardId) => set({ activeKey: cardId }),
}));
