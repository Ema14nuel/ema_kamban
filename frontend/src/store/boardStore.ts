import { create } from 'zustand';
import type { ActivityCard, Board, CardEvent, CardNote, LogEntry } from '../types';
import { STATUSES } from '../types';
import { api } from '../lib/api';
import { useMascotStore } from './mascotStore';

interface ApiCard {
  id: number;
  board: number;
  status: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  pomos: number;
  done_at: string;
  created_at: string;
}

interface ApiCardEvent {
  id: number;
  card: number;
  action: CardEvent['action'];
  detail: string;
  at: string;
}

interface ApiCardNote {
  id: number;
  card: number;
  text: string;
  created_at: string;
}

interface ApiColumn {
  id: number;
  board: number;
  key: string;
  title: string;
  color: string;
  order: number;
}

interface ApiBoard {
  id: number;
  name: string;
  color: string;
  bg_type: Board['bgType'];
  bg_value: string;
  music_url: string;
  music_name: string;
  cards: ApiCard[];
  columns: ApiColumn[];
}

function mapApiCard(c: ApiCard): ActivityCard {
  return {
    id: String(c.id),
    title: c.title,
    desc: c.desc,
    date: c.date,
    time: c.time,
    pomos: c.pomos,
    doneAt: c.done_at || undefined,
    createdAt: c.created_at,
  };
}

function cardsToColumns(cards: ApiCard[], customColumns: ApiColumn[]) {
  const fixed = STATUSES.map((s) => ({
    id: `col-${s.key}`,
    status: s.key as string,
    title: s.title,
    color: s.color,
    isCustom: false,
    cards: cards.filter((c) => c.status === s.key).map(mapApiCard),
  }));
  const custom = customColumns
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((cc) => ({
      id: `col-${cc.key}`,
      status: cc.key,
      title: cc.title,
      color: cc.color,
      isCustom: true,
      customColumnId: String(cc.id),
      cards: cards.filter((c) => c.status === cc.key).map(mapApiCard),
    }));
  return [...fixed, ...custom];
}

const PATCH_DEBOUNCE_MS = 600;

interface CardWriteQueue {
  timer: ReturnType<typeof setTimeout> | null;
  pending: Record<string, unknown>;
  inFlight: boolean;
}
const cardWriteQueues = new Map<string, CardWriteQueue>();

/**
 * Coalesces rapid edits (typing) into a single request with the latest
 * value, and never lets two requests for the same card be in flight at
 * once — otherwise an older request can resolve after a newer one and
 * overwrite it with stale/partial data.
 */
function scheduleCardPatch(cardId: string, patch: Record<string, unknown>, onError: () => void) {
  let queue = cardWriteQueues.get(cardId);
  if (!queue) {
    queue = { timer: null, pending: {}, inFlight: false };
    cardWriteQueues.set(cardId, queue);
  }
  queue.pending = { ...queue.pending, ...patch };
  if (queue.timer) clearTimeout(queue.timer);
  queue.timer = setTimeout(() => flushCardPatch(cardId, onError), PATCH_DEBOUNCE_MS);
}

function flushCardPatch(cardId: string, onError: () => void) {
  const queue = cardWriteQueues.get(cardId);
  if (!queue || Object.keys(queue.pending).length === 0) return;
  if (queue.inFlight) {
    queue.timer = setTimeout(() => flushCardPatch(cardId, onError), PATCH_DEBOUNCE_MS);
    return;
  }
  const body = queue.pending;
  queue.pending = {};
  queue.inFlight = true;
  api
    .patch(`/cards/${cardId}/`, body)
    .catch(onError)
    .finally(() => {
      queue.inFlight = false;
      if (Object.keys(queue.pending).length > 0) flushCardPatch(cardId, onError);
    });
}

function apiBoardToBoard(b: ApiBoard): Board {
  return {
    id: String(b.id),
    name: b.name,
    color: b.color,
    bgType: b.bg_type,
    bgValue: b.bg_value,
    musicUrl: b.music_url,
    musicName: b.music_name,
    columns: cardsToColumns(b.cards, b.columns),
  };
}

export interface NewBoardInput {
  name: string;
  color: string;
  bgType: Board['bgType'];
  bgValue: string;
  musicUrl: string;
  musicName: string;
}

export interface NewCardInput {
  title: string;
  desc: string;
  date: string;
  time: string;
  status: string;
}

interface BoardStoreState {
  boards: Board[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  addBoard: (input: NewBoardInput) => Promise<string | null>;
  updateBoard: (id: string, patch: Partial<NewBoardInput>) => Promise<void>;
  removeBoard: (id: string) => Promise<void>;
  refreshBoard: (boardId: string) => Promise<void>;

  addColumn: (boardId: string, title: string, color: string) => Promise<void>;
  removeColumn: (boardId: string, customColumnId: string) => Promise<void>;

  addCard: (boardId: string, input: NewCardInput) => Promise<void>;
  patchCard: (boardId: string, cardId: string, patch: Partial<Pick<ActivityCard, 'title' | 'desc' | 'date' | 'time'>>) => Promise<void>;
  removeCard: (boardId: string, cardId: string) => Promise<void>;
  moveCard: (boardId: string, cardId: string, toStatus: string) => Promise<void>;
  completePomodoro: (boardId: string, cardId: string, minutes: number) => Promise<LogEntry | null>;
  fetchCardHistory: (cardId: string) => Promise<CardEvent[]>;
  fetchCardNotes: (cardId: string) => Promise<CardNote[]>;
  addCardNote: (cardId: string, text: string) => Promise<CardNote | null>;

  findCard: (boardId: string, cardId: string) => { board: Board; card: ActivityCard; status: string } | null;
  countOf: (board: Board) => number;
  pendingCountOf: (board: Board) => number;
}

export const useBoardStore = create<BoardStoreState>()((set, get) => ({
  boards: [],
  loaded: false,
  loading: false,
  error: null,

  fetchBoards: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<ApiBoard[]>('/boards/');
      set({ boards: data.map(apiBoardToBoard), loaded: true, loading: false });
    } catch {
      set({ error: 'No se pudieron cargar los tableros.', loading: false });
    }
  },

  refreshBoard: async (boardId) => {
    try {
      const data = await api.get<ApiBoard>(`/boards/${boardId}/`);
      const board = apiBoardToBoard(data);
      set((s) => ({ boards: s.boards.map((b) => (b.id === boardId ? board : b)) }));
    } catch {
      set({ error: 'No se pudo actualizar el tablero.' });
    }
  },

  addBoard: async (input) => {
    try {
      const data = await api.post<ApiBoard>('/boards/', {
        name: input.name,
        color: input.color,
        bg_type: input.bgType,
        bg_value: input.bgValue,
        music_url: input.musicUrl,
        music_name: input.musicName,
      });
      const board = apiBoardToBoard(data);
      set((s) => ({ boards: s.boards.concat(board) }));
      return board.id;
    } catch {
      set({ error: 'No se pudo crear el tablero.' });
      return null;
    }
  },

  updateBoard: async (id, patch) => {
    try {
      const data = await api.patch<ApiBoard>(`/boards/${id}/`, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.bgType !== undefined ? { bg_type: patch.bgType } : {}),
        ...(patch.bgValue !== undefined ? { bg_value: patch.bgValue } : {}),
        ...(patch.musicUrl !== undefined ? { music_url: patch.musicUrl } : {}),
        ...(patch.musicName !== undefined ? { music_name: patch.musicName } : {}),
      });
      const board = apiBoardToBoard(data);
      set((s) => ({ boards: s.boards.map((b) => (b.id === id ? board : b)) }));
    } catch {
      set({ error: 'No se pudo actualizar el tablero.' });
    }
  },

  removeBoard: async (id) => {
    try {
      await api.del(`/boards/${id}/`);
      set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }));
    } catch {
      set({ error: 'No se pudo borrar el tablero.' });
    }
  },

  addColumn: async (boardId, title, color) => {
    try {
      await api.post('/columns/', { board: Number(boardId), title, color });
      await get().refreshBoard(boardId);
    } catch {
      set({ error: 'No se pudo crear la columna.' });
    }
  },

  removeColumn: async (boardId, customColumnId) => {
    try {
      await api.del(`/columns/${customColumnId}/`);
      await get().refreshBoard(boardId);
    } catch {
      set({ error: 'No se pudo borrar la columna.' });
    }
  },

  addCard: async (boardId, input) => {
    try {
      const data = await api.post<ApiCard>('/cards/', {
        board: Number(boardId),
        status: input.status,
        title: input.title,
        desc: input.desc,
        date: input.date,
        time: input.time,
      });
      const card = mapApiCard(data);
      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === boardId ? { ...b, columns: b.columns.map((c) => (c.status === input.status ? { ...c, cards: c.cards.concat(card) } : c)) } : b,
        ),
      }));
    } catch {
      set({ error: 'No se pudo crear la actividad.' });
    }
  },

  patchCard: async (boardId, cardId, patch) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId
          ? { ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.map((k) => (k.id === cardId ? { ...k, ...patch } : k)) })) }
          : b,
      ),
    }));
    scheduleCardPatch(cardId, patch, () => set({ error: 'No se pudo guardar el cambio.' }));
  },

  removeCard: async (boardId, cardId) => {
    try {
      await api.del(`/cards/${cardId}/`);
      set((s) => ({
        boards: s.boards.map((b) => (b.id === boardId ? { ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== cardId) })) } : b)),
      }));
    } catch {
      set({ error: 'No se pudo borrar la actividad.' });
    }
  },

  moveCard: async (boardId, cardId, toStatus) => {
    if (toStatus === 'done') useMascotStore.getState().celebrate();
    try {
      const data = await api.post<ApiCard>(`/cards/${cardId}/move/`, { status: toStatus });
      set((s) => ({
        boards: s.boards.map((b) => {
          if (b.id !== boardId) return b;
          let moved: ActivityCard | null = null;
          const cols = b.columns.map((c) => {
            const hit = c.cards.find((k) => k.id === cardId);
            if (!hit) return c;
            moved = { ...hit, doneAt: data.done_at || undefined };
            return { ...c, cards: c.cards.filter((k) => k.id !== cardId) };
          });
          if (!moved) return b;
          return { ...b, columns: cols.map((c) => (c.status === toStatus ? { ...c, cards: c.cards.concat([moved as ActivityCard]) } : c)) };
        }),
      }));
    } catch {
      set({ error: 'No se pudo mover la actividad.' });
    }
  },

  completePomodoro: async (boardId, cardId, minutes) => {
    try {
      const data = await api.post<{
        card: ApiCard;
        entry: { id: number; title: string; board_name: string; color: string; minutes: number; at: string };
      }>(`/cards/${cardId}/complete_pomodoro/`, { minutes });
      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === boardId
            ? { ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.map((k) => (k.id === cardId ? { ...k, pomos: data.card.pomos } : k)) })) }
            : b,
        ),
      }));
      return {
        id: String(data.entry.id),
        cardId,
        boardId,
        title: data.entry.title,
        boardName: data.entry.board_name,
        color: data.entry.color,
        minutes: data.entry.minutes,
        at: new Date(data.entry.at).getTime(),
      };
    } catch {
      set({ error: 'No se pudo registrar el pomodoro.' });
      return null;
    }
  },

  fetchCardHistory: async (cardId) => {
    try {
      const data = await api.get<ApiCardEvent[]>(`/cards/${cardId}/history/`);
      return data.map((e) => ({ id: String(e.id), action: e.action, detail: e.detail, at: new Date(e.at).getTime() }));
    } catch {
      return [];
    }
  },

  fetchCardNotes: async (cardId) => {
    try {
      const data = await api.get<ApiCardNote[]>(`/cards/${cardId}/notes/`);
      return data.map((n) => ({ id: String(n.id), text: n.text, createdAt: new Date(n.created_at).getTime() }));
    } catch {
      return [];
    }
  },

  addCardNote: async (cardId, text) => {
    try {
      const data = await api.post<ApiCardNote>(`/cards/${cardId}/notes/`, { text });
      return { id: String(data.id), text: data.text, createdAt: new Date(data.created_at).getTime() };
    } catch {
      set({ error: 'No se pudo guardar la nota.' });
      return null;
    }
  },

  findCard: (boardId, cardId) => {
    const board = get().boards.find((b) => b.id === boardId);
    if (!board) return null;
    for (const col of board.columns) {
      const card = col.cards.find((k) => k.id === cardId);
      if (card) return { board, card, status: col.status };
    }
    return null;
  },

  countOf: (board) => board.columns.reduce((n, c) => n + c.cards.length, 0),
  pendingCountOf: (board) => board.columns.find((c) => c.status === 'pending')?.cards.length || 0,
}));
