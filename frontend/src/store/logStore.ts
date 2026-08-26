import { create } from 'zustand';
import type { LogEntry } from '../types';
import { api } from '../lib/api';

interface ApiLogEntry {
  id: number;
  card: number | null;
  board: number | null;
  title: string;
  board_name: string;
  color: string;
  minutes: number;
  at: string;
}

function apiEntryToEntry(e: ApiLogEntry): LogEntry {
  return {
    id: String(e.id),
    cardId: e.card !== null ? String(e.card) : '',
    boardId: e.board !== null ? String(e.board) : '',
    title: e.title,
    boardName: e.board_name,
    color: e.color,
    minutes: e.minutes,
    at: new Date(e.at).getTime(),
  };
}

interface LogState {
  log: LogEntry[];
  loaded: boolean;
  error: string | null;

  fetchLog: () => Promise<void>;
  prependEntry: (entry: LogEntry) => void;
}

export const useLogStore = create<LogState>()((set) => ({
  log: [],
  loaded: false,
  error: null,

  fetchLog: async () => {
    try {
      const data = await api.get<ApiLogEntry[]>('/log/');
      set({ log: data.map(apiEntryToEntry), loaded: true });
    } catch {
      set({ error: 'No se pudo cargar el registro.' });
    }
  },

  prependEntry: (entry) => set((s) => ({ log: [entry, ...s.log] })),
}));
