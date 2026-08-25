import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityCard, DayKey, DaySchedule, Routine } from '../types';
import { DAY_KEYS, DAY_LABELS } from '../types';
import { uid } from '../lib/id';
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

interface RoutineState {
  routines: Routine[];
  createRoutine: (form: RoutineForm) => number;
  removeRoutine: (id: string) => void;
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set) => ({
      routines: [],

      createRoutine: (form) => {
        const bid = form.boardId;
        if (!form.title.trim() || !form.from || !form.to || !bid) return 0;
        const start = new Date(`${form.from}T00:00:00`);
        const end = new Date(`${form.to}T00:00:00`);
        if (end < start) return 0;

        const cards: ActivityCard[] = [];
        for (const d = new Date(start); d <= end && cards.length < 400; d.setDate(d.getDate() + 1)) {
          const key = DAY_KEYS[(d.getDay() + 6) % 7];
          const cfg = form.days[key];
          if (!cfg || !cfg.on) continue;
          const time = cfg.mode === 'range' ? cfg.start : cfg.time;
          const desc = cfg.mode === 'range' ? `Entre ${cfg.start} y ${cfg.end}` : '';
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          cards.push({ id: uid(), title: form.title.trim(), desc, date: iso, time });
        }
        if (!cards.length) return 0;

        useBoardStore.getState().addCardsToStatus(bid, 'pending', cards);

        const routine: Routine = { id: uid(), title: form.title.trim(), boardId: bid, from: form.from, to: form.to, days: form.days, count: cards.length };
        set((s) => ({ routines: s.routines.concat(routine) }));
        return cards.length;
      },

      removeRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),
    }),
    { name: 'kamban-routines' },
  ),
);
