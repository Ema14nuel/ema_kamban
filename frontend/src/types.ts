export type StatusKey = 'pending' | 'progress' | 'waiting' | 'done';

export interface StatusDef {
  key: StatusKey;
  title: string;
  color: string;
}

export const STATUSES: StatusDef[] = [
  { key: 'pending', title: 'Pending', color: 'var(--status-pending)' },
  { key: 'progress', title: 'In Progress', color: 'var(--status-progress)' },
  { key: 'waiting', title: 'Waiting', color: 'var(--status-waiting)' },
  { key: 'done', title: 'Completed', color: 'var(--status-done)' },
];

export const STATUS_HEX: Record<StatusKey, string> = {
  pending: '#f59e0b',
  progress: '#3b82f6',
  waiting: '#a855f7',
  done: '#10b981',
};

export interface ActivityCard {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  pomos?: number;
  doneAt?: string;
}

export interface Column {
  id: string;
  status: StatusKey;
  cards: ActivityCard[];
}

export type BoardBgType = 'gradient' | 'color' | 'image';

export interface Board {
  id: string;
  name: string;
  color: string;
  bgType: BoardBgType;
  bgValue: string;
  musicUrl: string;
  musicName: string;
  columns: Column[];
}

export const BOARD_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#64748b'];

export const BOARD_GRADIENTS = [
  'linear-gradient(135deg,#0f2f7a,#2563eb 55%,#38bdf8)',
  'linear-gradient(135deg,#5b21b6,#a855f7 55%,#f0abfc)',
  'linear-gradient(135deg,#065f46,#10b981 60%,#5eead4)',
  'linear-gradient(135deg,#9a3412,#f97316 60%,#fbbf24)',
  'linear-gradient(135deg,#831843,#db2777 60%,#fb7185)',
  'linear-gradient(135deg,#0f172a,#334155 60%,#64748b)',
];

export const BOARD_SOLIDS = ['#1d4ed8', '#7c3aed', '#0f766e', '#b45309', '#be123c', '#3f4756'];

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export type DayMode = 'fixed' | 'range';

export interface DaySchedule {
  on: boolean;
  mode: DayMode;
  time: string;
  start: string;
  end: string;
}

export interface Routine {
  id: string;
  title: string;
  boardId: string;
  from: string;
  to: string;
  days: Record<DayKey, DaySchedule>;
  count: number;
}

export interface LogEntry {
  id: string;
  cardId: string;
  boardId: string;
  title: string;
  boardName: string;
  color: string;
  minutes: number;
  at: number;
}

export type PomodoroMode = 'focus' | 'short' | 'long';

export interface PomodoroTask {
  cardId: string;
  boardId: string;
}

export interface PomodoroState {
  mode: PomodoroMode;
  left: number;
  running: boolean;
  round: number;
  tasks: PomodoroTask[];
  activeKey: string | null;
}

export const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  focus: 1500,
  short: 300,
  long: 900,
};

export interface Medal {
  tier: 'oro' | 'plata' | 'bronce';
  color: string;
  shade: string;
  label: string;
}

export type SpriteKey = 'chico' | 'chica' | 'perro' | 'gato';

export const SPRITES: { k: SpriteKey; name: string; src: string }[] = [
  { k: 'chico', name: 'Chico', src: '/sprites/chico.png' },
  { k: 'chica', name: 'Chica', src: '/sprites/chica.png' },
  { k: 'perro', name: 'Perro', src: '/sprites/perro.png' },
  { k: 'gato', name: 'Gato', src: '/sprites/gato.png' },
];

export type Theme = 'dark' | 'light';

export type ModalKind = 'board' | 'activity' | 'profile' | 'settings' | null;

export interface ModalState {
  kind: ModalKind;
  boardId?: string | null;
  status?: StatusKey;
}
