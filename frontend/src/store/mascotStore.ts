import { create } from 'zustand';

interface MascotState {
  x: number;
  dir: 1 | -1;
  duration: number;
  cheering: boolean;
  step: () => void;
  celebrate: () => void;
}

let cheerTimer: ReturnType<typeof setTimeout> | null = null;

export const useMascotStore = create<MascotState>()((set, get) => ({
  x: 10,
  dir: 1,
  duration: 1.8,
  cheering: false,

  step: () => {
    const from = get().x;
    const next = Math.round(Math.random() * 84 + 4);
    set({ x: next, dir: next >= from ? 1 : -1, duration: Math.max(1.8, Math.abs(next - from) / 11) });
  },

  celebrate: () => {
    if (cheerTimer) clearTimeout(cheerTimer);
    set({ cheering: true });
    cheerTimer = setTimeout(() => set({ cheering: false }), 3200);
  },
}));
