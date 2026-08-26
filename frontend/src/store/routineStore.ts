import { create } from 'zustand';
import type { DayKey, DaySchedule, Routine } from '../types';
import { DAY_KEYS, DAY_LABELS } from '../types';
import { api, ApiError } from '../lib/api';
import { useBoardStore } from './boardStore';

export interface RoutineForm {
  title: string;
  boardId: string | null;
  from: string;
  to: string;
  days: Record<DayKey, DaySchedule>;
}

function makeDay(on: boolean): DaySchedule {
  return { on, mode: 'fixed', time: '09:00', start: '09:00', end: '10:00' };
}

export function emptyRoutineForm(): RoutineForm {
  return {
    title: '',
    boardId: null,
    from: '',
    to: '',
    days: {
      mon: makeDay(true),
      tue: makeDay(true),
      wed: makeDay(true),
      thu: makeDay(true),
      fri: makeDay(true),
      sat: makeDay(false),
      sun: makeDay(false),
    },
  };
}

export function routineSummary(r: Pick<Routine, 'days'>): string {
  return DAY_KEYS.filter((k) => r.days[k]?.on)
    .map((k) => {
      const d = r.days[k];
      return `${DAY_LABELS[k].slice(0, 3)} ${d.mode === 'range' ? `${d.start}–${d.end}` : d.time}`;
    })
    .join(' · ');
}

interface ApiRoutine {
  id: number;
  board: number;
  title: string;
  date_from: string;
  date_to: string;
  days: Record<DayKey, DaySchedule>;
  count: number;
}

function apiRoutineToRoutine(r: ApiRoutine): Routine {
  return { id: String(r.id), boardId: String(r.board), title: r.title, from: r.date_from, to: r.date_to, days: r.days, count: r.count };
}

interface RoutineState {
  routines: Routine[];
  loaded: boolean;
  error: string | null;

  fetchRoutines: () => Promise<void>;
  createRoutine: (form: RoutineForm) => Promise<number>;
  removeRoutine: (id: string) => Promise<void>;
}

export const useRoutineStore = create<RoutineState>()((set) => ({
  routines: [],
  loaded: false,
  error: null,

  fetchRoutines: async () => {
    try {
      const data = await api.get<ApiRoutine[]>('/routines/');
      set({ routines: data.map(apiRoutineToRoutine), loaded: true });
    } catch {
      set({ error: 'No se pudieron cargar las programaciones.' });
    }
  },

  createRoutine: async (form) => {
    if (!form.title.trim() || !form.from || !form.to || !form.boardId) {
      set({ error: 'Revisa el nombre, el tablero y el rango de fechas.' });
      return 0;
    }
    try {
      const data = await api.post<ApiRoutine>('/routines/', {
        board: Number(form.boardId),
        title: form.title.trim(),
        date_from: form.from,
        date_to: form.to,
        days: form.days,
      });
      const routine = apiRoutineToRoutine(data);
      set((s) => ({ routines: [routine, ...s.routines], error: null }));
      await useBoardStore.getState().refreshBoard(form.boardId);
      return routine.count;
    } catch (err) {
      const detail = err instanceof ApiError && err.body && typeof err.body === 'object' ? (err.body as { detail?: string }).detail : null;
      set({ error: detail || 'No se pudo programar la actividad.' });
      return 0;
    }
  },

  removeRoutine: async (id) => {
    try {
      await api.del(`/routines/${id}/`);
      set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
    } catch {
      set({ error: 'No se pudo borrar la programación.' });
    }
  },
}));
