import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpriteKey } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export type AuthScreen = 'login' | 'recover' | 'in';

export function displayName(user: CurrentUser | null): string {
  if (!user) return '';
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  sprite: SpriteKey;
  avatar: string | null;
  notify_on_pomodoro: boolean;
}

interface AuthState {
  auth: AuthScreen;
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  error: string | null;
  recoverSent: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => void;
  goRecover: () => void;
  goLogin: () => void;
  sendRecover: () => void;
  updateProfile: (patch: Partial<Pick<CurrentUser, 'first_name' | 'last_name' | 'sprite' | 'notify_on_pomodoro'>>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      auth: 'login',
      accessToken: null,
      refreshToken: null,
      user: null,
      error: null,
      recoverSent: false,

      login: async (email, password) => {
        set({ error: null });
        try {
          const res = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) {
            set({ error: 'Correo o contraseña incorrectos.' });
            return false;
          }
          const data = await res.json();
          set({ accessToken: data.access, refreshToken: data.refresh, user: data.user, auth: 'in', error: null });
          return true;
        } catch {
          set({ error: 'No se pudo conectar con el servidor.' });
          return false;
        }
      },

      refreshAccessToken: async () => {
        const refresh = get().refreshToken;
        if (!refresh) return false;
        try {
          const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
          });
          if (!res.ok) return false;
          const data = await res.json();
          set({ accessToken: data.access });
          return true;
        } catch {
          return false;
        }
      },

      logout: () => set({ auth: 'login', accessToken: null, refreshToken: null, user: null, recoverSent: false }),
      goRecover: () => set({ auth: 'recover', recoverSent: false }),
      goLogin: () => set({ auth: 'login', error: null }),
      sendRecover: () => set({ recoverSent: true }),

      updateProfile: async (patch) => {
        const access = get().accessToken;
        const res = await fetch(`${API_BASE_URL}/auth/me/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return;
        const user = await res.json();
        set({ user });
      },

      uploadAvatar: async (file) => {
        const access = get().accessToken;
        const body = new FormData();
        body.append('avatar', file);
        const res = await fetch(`${API_BASE_URL}/auth/me/`, {
          method: 'PATCH',
          headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}) },
          body,
        });
        if (!res.ok) return;
        const user = await res.json();
        set({ user });
      },

      removeAvatar: async () => {
        const access = get().accessToken;
        const res = await fetch(`${API_BASE_URL}/auth/me/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
          body: JSON.stringify({ avatar: null }),
        });
        if (!res.ok) return;
        const user = await res.json();
        set({ user });
      },
    }),
    {
      name: 'kamban-auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, auth: s.auth }),
    },
  ),
);
