import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityCard, Board, StatusKey } from '../types';
import { STATUSES } from '../types';
import { uid } from '../lib/id';
import { todayIso } from '../lib/date';
import { useMascotStore } from './mascotStore';

function seedColumns(cards: Record<StatusKey, ActivityCard[]>) {
  return STATUSES.map((s) => ({ id: uid(), status: s.key, cards: cards[s.key] || [] }));
}

const seedBoards: Board[] = [
  {
    id: 'b1',
    name: 'Operación Atiempo',
    color: '#3b82f6',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg,#0f2f7a,#2563eb 55%,#38bdf8)',
    musicUrl: '',
    musicName: 'ninguna',
    columns: seedColumns({
      pending: [
        { id: 'k1', title: 'Definir alcance del sprint', desc: 'Revisar backlog con el equipo de producto.', date: '2026-08-27', time: '09:30' },
        { id: 'k2', title: 'Actualizar inventario', desc: '', date: '2026-08-31', time: '15:00' },
      ],
      progress: [
        { id: 'k3', title: 'Integración de pagos', desc: 'Ambiente de pruebas listo, faltan webhooks.', date: '2026-08-26', time: '11:00' },
      ],
      waiting: [{ id: 'k4', title: 'Aprobación de contrato', desc: 'Depende de legal.', date: '2026-08-28', time: '' }],
      done: [{ id: 'k5', title: 'Migración de base de datos', desc: '', date: '2026-08-20', time: '18:00' }],
    }),
  },
  {
    id: 'b2',
    name: 'Clientes',
    color: '#14b8a6',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg,#065f46,#10b981 60%,#5eead4)',
    musicUrl: '',
    musicName: 'ninguna',
    columns: seedColumns({
      pending: [{ id: 'k6', title: 'Llamada con Coltec', desc: 'Renovación anual.', date: '2026-08-26', time: '16:00' }],
      progress: [{ id: 'k7', title: 'Propuesta Andina S.A.', desc: '', date: '2026-08-27', time: '10:00' }],
      waiting: [],
      done: [{ id: 'k8', title: 'Cierre Nexa', desc: '', date: '2026-08-19', time: '12:00' }],
    }),
  },
  {
    id: 'b3',
    name: 'Personal',
    color: '#f97316',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg,#9a3412,#f97316 60%,#fbbf24)',
    musicUrl: '',
    musicName: 'ninguna',
    columns: seedColumns({
      pending: [{ id: 'k9', title: 'Renovar licencia', desc: '', date: '2026-09-02', time: '08:00' }],
      progress: [],
      waiting: [],
      done: [],
    }),
  },
  {
    id: 'b4',
    name: 'Universidad',
    color: '#8b5cf6',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg,#5b21b6,#a855f7 55%,#f0abfc)',
    musicUrl: '',
    musicName: 'ninguna',
    columns: seedColumns({
      pending: [{ id: 'k10', title: 'Entrega proyecto final', desc: 'Informe + sustentación.', date: '2026-08-28', time: '18:30' }],
      progress: [{ id: 'k11', title: 'Estudiar módulo 4', desc: '', date: '2026-08-25', time: '20:00' }],
      waiting: [],
      done: [],
    }),
  },
];

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
  status: StatusKey;
}

interface BoardStoreState {
  boards: Board[];
  addBoard: (input: NewBoardInput) => string;
  updateBoard: (id: string, patch: Partial<Board>) => void;
  removeBoard: (id: string) => void;
  addCard: (boardId: string, input: NewCardInput) => void;
  addCardsToStatus: (boardId: string, status: StatusKey, cards: ActivityCard[]) => void;
  patchCard: (boardId: string, cardId: string, patch: Partial<ActivityCard>) => void;
  removeCard: (boardId: string, cardId: string) => void;
  moveCard: (boardId: string, cardId: string, toStatus: StatusKey) => void;
  findCard: (boardId: string, cardId: string) => { board: Board; card: ActivityCard; status: StatusKey } | null;
  countOf: (board: Board) => number;
  pendingCountOf: (board: Board) => number;
}

export const useBoardStore = create<BoardStoreState>()(
  persist(
    (set, get) => ({
      boards: seedBoards,

      addBoard: (input) => {
        const id = uid();
        const board: Board = {
          id,
          name: input.name,
          color: input.color,
          bgType: input.bgType,
          bgValue: input.bgValue,
          musicUrl: input.musicUrl,
          musicName: input.musicName,
          columns: STATUSES.map((s) => ({ id: uid(), status: s.key, cards: [] })),
        };
        set((s) => ({ boards: s.boards.concat(board) }));
        return id;
      },

      updateBoard: (id, patch) => {
        set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      },

      removeBoard: (id) => {
        set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }));
      },

      addCard: (boardId, input) => {
        const card: ActivityCard = { id: uid(), title: input.title, desc: input.desc, date: input.date, time: input.time };
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? { ...b, columns: b.columns.map((c) => (c.status === input.status ? { ...c, cards: c.cards.concat(card) } : c)) }
              : b,
          ),
        }));
      },

      addCardsToStatus: (boardId, status, cards) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? { ...b, columns: b.columns.map((c) => (c.status === status ? { ...c, cards: c.cards.concat(cards) } : c)) }
              : b,
          ),
        }));
      },

      patchCard: (boardId, cardId, patch) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? { ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.map((k) => (k.id === cardId ? { ...k, ...patch } : k)) })) }
              : b,
          ),
        }));
      },

      removeCard: (boardId, cardId) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== cardId) })) } : b,
          ),
        }));
      },

      moveCard: (boardId, cardId, toStatus) => {
        if (toStatus === 'done') useMascotStore.getState().celebrate();
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            let moved: ActivityCard | null = null;
            const cols = b.columns.map((c) => {
              const hit = c.cards.find((k) => k.id === cardId);
              if (!hit) return c;
              moved = toStatus === 'done' ? { ...hit, doneAt: todayIso() } : hit;
              return { ...c, cards: c.cards.filter((k) => k.id !== cardId) };
            });
            if (!moved) return b;
            return { ...b, columns: cols.map((c) => (c.status === toStatus ? { ...c, cards: c.cards.concat([moved as ActivityCard]) } : c)) };
          }),
        }));
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
    }),
    { name: 'kamban-boards' },
  ),
);
