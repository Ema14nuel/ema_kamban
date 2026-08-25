import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogEntry } from '../types';
import { uid } from '../lib/id';

interface LogState {
  log: LogEntry[];
  addEntry: (entry: Omit<LogEntry, 'id'>) => void;
}

export const useLogStore = create<LogState>()(
  persist(
    (set) => ({
      log: [],
      addEntry: (entry) => set((s) => ({ log: [{ ...entry, id: uid() }, ...s.log] })),
    }),
    { name: 'kamban-log' },
  ),
);
