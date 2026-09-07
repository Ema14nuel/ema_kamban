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
  /** Hora absoluta de finalización: permite recuperar el conteo tras recargar. */
  endsAt: number | null;
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
      endsAt: null,
      round: 1,
      tasks: [],
      activeKey: null,
      durations: { ...POMODORO_DURATIONS },

      setMode: (mode) => set({ mode, left: get().durations[mode], running: false, endsAt: null }),

      setDuration: (mode, minutes) => {
        const clamped = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(minutes)));
        const seconds = clamped * 60;
        set((s) => ({
          durations: { ...s.durations, [mode]: seconds },
          left: s.mode === mode && !s.running ? seconds : s.left,
        }));
      },

      toggleRun: () =>
        set((s) => {
          if (s.running) {
            const left = s.endsAt ? Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000)) : s.left;
            return { running: false, endsAt: null, left };
          }
          const left = s.left <= 0 ? s.durations[s.mode] : s.left;
          return { running: true, left, endsAt: Date.now() + left * 1000 };
        }),

      reset: () => set((s) => ({ left: s.durations[s.mode], running: false, endsAt: null })),

      tick: () => {
        const s = get();
        if (!s.running) return;
        const left = s.endsAt ? Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000)) : s.left - 1;
        if (left > 0) {
          set({ left });
          return;
        }
        const finishedFocus = s.mode === 'focus';
        set({ left: 0, running: false, endsAt: null, round: finishedFocus ? s.round + 1 : s.round });
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
    {
      name: 'kamban-pomodoro',
      version: 2,
      partialize: (s) => ({ mode: s.mode, left: s.left, running: s.running, endsAt: s.endsAt, round: s.round, tasks: s.tasks, activeKey: s.activeKey, durations: s.durations }),
      // Las sesiones guardadas por versiones anteriores no tenían `endsAt`.
      // Al restaurarlas se convierte el tiempo restante en una fecha absoluta,
      // para que cerrar/recargar el navegador no pause el conteo.
      onRehydrateStorage: () => (state) => {
        if (state?.running && !state.endsAt) {
          usePomodoroStore.setState({ endsAt: Date.now() + state.left * 1000 });
        }
      },
    },
  ),
);
