import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import type { SpriteKey } from '../types';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  sprite: SpriteKey;
  avatar: string | null;
  notify_on_pomodoro: boolean;
  date_joined: string;
}

export interface NewUserInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_staff: boolean;
}

export interface EditUserInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  /** Si viene, resetea la contraseña de la cuenta. Se omite si está vacía. */
  password?: string;
}

function errorDetail(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    const body = err.body as Record<string, unknown>;
    const firstKey = Object.keys(body)[0];
    const value = firstKey ? body[firstKey] : null;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

interface AdminUsersState {
  users: AdminUser[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  createUser: (input: NewUserInput) => Promise<boolean>;
  updateUser: (id: number, patch: EditUserInput) => Promise<boolean>;
  setActive: (id: number, isActive: boolean) => Promise<void>;
}

export const useAdminUsersStore = create<AdminUsersState>()((set) => ({
  users: [],
  loaded: false,
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<AdminUser[]>('/users/');
      set({ users: data, loaded: true, loading: false });
    } catch {
      set({ error: 'No se pudo cargar la lista de usuarios.', loading: false });
    }
  },

  createUser: async (input) => {
    set({ error: null });
    try {
      const user = await api.post<AdminUser>('/users/', input);
      set((s) => ({ users: s.users.concat(user).sort((a, b) => a.username.localeCompare(b.username)) }));
      return true;
    } catch (err) {
      set({ error: errorDetail(err, 'No se pudo crear el usuario.') });
      return false;
    }
  },

  updateUser: async (id, patch) => {
    set({ error: null });
    try {
      const user = await api.patch<AdminUser>(`/users/${id}/`, patch);
      set((s) => ({ users: s.users.map((u) => (u.id === id ? user : u)) }));
      return true;
    } catch (err) {
      set({ error: errorDetail(err, 'No se pudo actualizar el usuario.') });
      return false;
    }
  },

  setActive: async (id, isActive) => {
    try {
      const user = await api.patch<AdminUser>(`/users/${id}/`, { is_active: isActive });
      set((s) => ({ users: s.users.map((u) => (u.id === id ? user : u)) }));
    } catch {
      set({ error: 'No se pudo cambiar el estado del usuario.' });
    }
  },
}));
