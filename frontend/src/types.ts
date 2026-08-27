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
  createdAt?: string;
}

/** Columna personalizada agregada a un tablero puntual (no las 4 fijas). */
export interface CustomColumn {
  id: string;
  key: string;
  title: string;
  color: string;
  order: number;
}

export interface Column {
  id: string;
  /** Una de las 4 StatusKey fijas, o la `key` de una CustomColumn del tablero. */
  status: string;
  title: string;
  color: string;
  isCustom: boolean;
  /** Solo para columnas personalizadas: id de la Column en el backend (para editar/borrar). */
  customColumnId?: string;
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

export const BOARD_COLORS = [
  '#ef4444', // rojo
  '#f97316', // naranja
  '#f59e0b', // ámbar
  '#eab308', // amarillo
  '#84cc16', // lima
  '#22c55e', // verde
  '#10b981', // esmeralda
  '#14b8a6', // teal
  '#06b6d4', // cian
  '#3b82f6', // azul
  '#6366f1', // índigo
  '#8b5cf6', // violeta
  '#d946ef', // fucsia
  '#ec4899', // rosa
];

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
  description: string;
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

export interface SpriteDef {
  k: SpriteKey;
  name: string;
  /** Imagen estática — vista previa en Configuración, y sprite de perro/gato (sin animación cuadro por cuadro). */
  src: string;
  /** Cuadros del ciclo de caminata, en orden. Si falta, la mascota usa `src` con el rebote CSS de siempre. */
  walk?: string[];
  /** Cuadros del salto (al completar una actividad), en orden. */
  jump?: string[];
}

export const SPRITES: SpriteDef[] = [
  {
    k: 'chico',
    name: 'Chico',
    src: '/sprites/chico-idle.png',
    walk: ['/sprites/chico-walk-1.png', '/sprites/chico-walk-2.png', '/sprites/chico-walk-3.png', '/sprites/chico-walk-4.png'],
    jump: ['/sprites/chico-jump-1.png', '/sprites/chico-jump-2.png', '/sprites/chico-jump-3.png'],
  },
  {
    k: 'chica',
    name: 'Chica',
    src: '/sprites/chica-idle.png',
    walk: ['/sprites/chica-walk-1.png', '/sprites/chica-walk-2.png', '/sprites/chica-walk-3.png', '/sprites/chica-walk-4.png'],
    jump: ['/sprites/chica-jump-1.png', '/sprites/chica-jump-2.png', '/sprites/chica-jump-3.png'],
  },
  { k: 'perro', name: 'Perro', src: '/sprites/perro.png' },
  { k: 'gato', name: 'Gato', src: '/sprites/gato.png' },
];

export type Theme = 'dark' | 'light';

export type ModalKind = 'board' | 'activity' | 'profile' | 'settings' | 'column' | null;

export interface ModalState {
  kind: ModalKind;
  boardId?: string | null;
  status?: string;
}

export type CardEventAction = 'created' | 'edited' | 'moved';

export interface CardEvent {
  id: string;
  action: CardEventAction;
  detail: string;
  at: number;
}

export interface CardNote {
  id: string;
  text: string;
  createdAt: number;
}
