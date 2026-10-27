import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpriteKey } from '../types';
import { api } from '../lib/api';
import { sessionEpoch, isCurrentSession, assertCurrentSession, resetSessionData } from '../lib/session';

let refreshPending: Promise<boolean> | null = null;
let logoutPending: Promise<unknown> = Promise.resolve();

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
        resetSessionData();
        refreshPending = null;
        const epoch = sessionEpoch();
        set({ auth: 'login', accessToken: null, refreshToken: null, user: null, error: null });
        try {
          await logoutPending;
          if (!isCurrentSession(epoch)) return false;
          const res = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!isCurrentSession(epoch)) return false;
          if (!res.ok) {
            set({ error: 'Correo o contraseña incorrectos.' });
            return false;
          }
          const data = await res.json();
          if (!isCurrentSession(epoch)) return false;
          set({ accessToken: data.access, refreshToken: data.refresh, user: data.user, auth: 'in', error: null });
          return true;
        } catch {
          if (isCurrentSession(epoch)) set({ error: 'No se pudo conectar con el servidor.' });
          return false;
        }
      },

      refreshAccessToken: () => {
        if (refreshPending) return refreshPending;
        const epoch = sessionEpoch();
        const refresh = get().refreshToken;
        if (!refresh) return Promise.resolve(false);
        const pending = (async () => {
          try {
            const res = await fetch(API_BASE_URL + '/auth/refresh/', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh }),
            });
            if (!isCurrentSession(epoch)) return false;
            if (!res.ok) return get().refreshToken !== refresh && !!get().accessToken;
            const data = await res.json();
            if (!isCurrentSession(epoch)) return false;
            set({ accessToken: data.access, refreshToken: data.refresh });
            return true;
          } catch { return false; }
        })();
        refreshPending = pending;
        void pending.finally(() => { if (refreshPending === pending) refreshPending = null; });
        return pending;
      },

      logout: () => {
        const refresh = get().refreshToken;
        const access = get().accessToken;
        resetSessionData();
        refreshPending = null;
        const epoch = sessionEpoch();
        set({ auth: 'login', accessToken: null, refreshToken: null, user: null, recoverSent: false });
        logoutPending = refresh ? fetch(API_BASE_URL + '/auth/logout/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh, access }), signal: AbortSignal.timeout(8000),
        }).then((res) => {
          if (!res.ok) throw new Error('revocation');
        }).catch(() => {
          if (isCurrentSession(epoch)) set({ error: 'Sesión local cerrada; no se pudo confirmar la revocación en el servidor.' });
        }) : Promise.resolve();
      },
      goRecover: () => set({ auth: 'recover', recoverSent: false }),
      goLogin: () => set({ auth: 'login', error: null }),
      sendRecover: () => set({ recoverSent: true }),

      updateProfile: async (patch) => {
        const epoch = sessionEpoch();
        assertCurrentSession(epoch);
        const user = await api.patch<CurrentUser>('/auth/me/', patch);
        if (isCurrentSession(epoch)) set({ user });
      },

      uploadAvatar: async (file) => {
        const epoch = sessionEpoch();
        assertCurrentSession(epoch);
        const body = new FormData();
        body.append('avatar', file);
        const user = await api.patch<CurrentUser>('/auth/me/', body);
        if (isCurrentSession(epoch)) set({ user });
      },

      removeAvatar: async () => {
        const epoch = sessionEpoch();
        assertCurrentSession(epoch);
        const user = await api.patch<CurrentUser>('/auth/me/', { avatar: null });
        if (isCurrentSession(epoch)) set({ user });
      },
    }),
    {
      name: 'kamban-auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, auth: s.auth }),
    },
  ),
);

// Cross-tab account changes must invalidate local requests and downloaded data too.
window.addEventListener('storage', (event) => {
  if (event.key === 'kamban-auth' || event.key === null) {
    const previousId = useAuthStore.getState().user?.id;
    void useAuthStore.persist.rehydrate();
    if (previousId !== useAuthStore.getState().user?.id) {
      resetSessionData();
      refreshPending = null;
    }
  }
});
