import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PomodoroMode, PomodoroTask } from '../types';
import { POMODORO_DURATIONS } from '../types';
import { useBoardStore } from './boardStore';
import { useLogStore } from './logStore';

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;

interface PomodoroStoreState {
  mode: PomodoroMode;
  left: number;
  running: boolean;
  round: number;
  tasks: PomodoroTask[];
  activeKey: string | null;
  durations: Record<PomodoroMode, number>;

  setMode: (mode: PomodoroMode) => void;
  setDuration: (mode: PomodoroMode, minutes: number) => void;
  toggleRun: () => void;
  reset: () => void;
  tick: () => void;
  addTask: (boardId: string, cardId: string) => void;
  removeTask: (cardId: string) => void;
  setActive: (cardId: string | null) => void;
}

export const usePomodoroStore = create<PomodoroStoreState>()(
  persist(
    (set, get) => ({
      mode: 'focus',
      left: POMODORO_DURATIONS.focus,
      running: false,
      round: 1,
      tasks: [],
      activeKey: null,
      durations: { ...POMODORO_DURATIONS },

      setMode: (mode) => set({ mode, left: get().durations[mode], running: false }),

      setDuration: (mode, minutes) => {
        const clamped = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(minutes)));
        const seconds = clamped * 60;
        set((s) => ({
          durations: { ...s.durations, [mode]: seconds },
          left: s.mode === mode && !s.running ? seconds : s.left,
        }));
      },

      toggleRun: () =>
        set((s) => ({ running: !s.running, left: s.left <= 0 ? s.durations[s.mode] : s.left })),

      reset: () => set((s) => ({ left: s.durations[s.mode], running: false })),

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
            useBoardStore
              .getState()
              .completePomodoro(active.boardId, active.cardId, Math.round(s.durations.focus / 60))
              .then((entry) => {
                if (entry) useLogStore.getState().prependEntry(entry);
              });
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
    }),
    { name: 'kamban-pomodoro', partialize: (s) => ({ durations: s.durations }) },
  ),
);
