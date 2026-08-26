import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModalState, Theme } from '../types';

export type PanelKind = 'focus' | 'pomodoro' | null;

interface FocusRef {
  boardId: string;
  cardId: string;
}

interface UiState {
  theme: Theme;
  toggleTheme: () => void;

  query: string;
  setQuery: (q: string) => void;

  userMenuOpen: boolean;
  toggleUserMenu: () => void;
  closeUserMenu: () => void;

  modal: ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;

  panel: PanelKind;
  focus: FocusRef | null;
  focusTab: 'detail' | 'pomodoros';
  openFocus: (boardId: string, cardId: string) => void;
  closeFocus: () => void;
  setFocusTab: (tab: 'detail' | 'pomodoros') => void;
  togglePomodoroPanel: () => void;
  closePanel: () => void;

  immersive: boolean;
  openImmersive: () => void;
  closeImmersive: () => void;

  mediaUrl: string;
  mediaName: string;
  setMedia: (url: string, name: string) => void;

  filter: string[] | null;
  toggleBoardFilter: (boardId: string, allBoardIds: string[]) => void;
  toggleAllBoardsFilter: (allBoardIds: string[]) => void;

  month: number | null;
  shiftMonth: (delta: number) => void;

  activeBoardId: string;
  setActiveBoardId: (id: string) => void;

  consolidatedView: 'columns' | 'calendar';
  setConsolidatedView: (v: 'columns' | 'calendar') => void;

  boardView: 'columns' | 'calendar';
  setBoardView: (v: 'columns' | 'calendar') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      query: '',
      setQuery: (query) => set({ query }),

      userMenuOpen: false,
      toggleUserMenu: () => set((s) => ({ userMenuOpen: !s.userMenuOpen })),
      closeUserMenu: () => set({ userMenuOpen: false }),

      modal: { kind: null },
      openModal: (modal) => set({ modal }),
      closeModal: () => set({ modal: { kind: null } }),

      panel: null,
      focus: null,
      focusTab: 'detail',
      openFocus: (boardId, cardId) => set({ focus: { boardId, cardId }, panel: 'focus', focusTab: 'detail' }),
      closeFocus: () => set({ focus: null, panel: null }),
      setFocusTab: (focusTab) => set({ focusTab }),
      togglePomodoroPanel: () => set((s) => ({ panel: s.panel === 'pomodoro' ? null : 'pomodoro', focus: s.panel === 'pomodoro' ? s.focus : null })),
      closePanel: () => set({ panel: null, focus: null }),

      immersive: false,
      openImmersive: () => set({ immersive: true }),
      closeImmersive: () => set({ immersive: false }),

      mediaUrl: '',
      mediaName: 'ninguno',
      setMedia: (mediaUrl, mediaName) => set({ mediaUrl, mediaName }),

      filter: null,
      toggleBoardFilter: (boardId, allBoardIds) => {
        const current = get().filter ?? allBoardIds;
        const has = current.includes(boardId);
        const next = has ? current.filter((id) => id !== boardId) : current.concat(boardId);
        set({ filter: next.length === allBoardIds.length ? null : next });
      },
      toggleAllBoardsFilter: (allBoardIds) => {
        const current = get().filter;
        set({ filter: current === null ? [] : null });
        void allBoardIds;
      },

      month: null,
      shiftMonth: (delta) => {
        const m = get().month ? new Date(get().month as number) : new Date();
        set({ month: new Date(m.getFullYear(), m.getMonth() + delta, 1).getTime() });
      },

      activeBoardId: '',
      setActiveBoardId: (activeBoardId) => set({ activeBoardId }),

      consolidatedView: 'columns',
      setConsolidatedView: (consolidatedView) => set({ consolidatedView }),

      boardView: 'columns',
      setBoardView: (boardView) => set({ boardView }),
    }),
    {
      name: 'kamban-ui',
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
