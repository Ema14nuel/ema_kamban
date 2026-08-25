import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthScreen = 'login' | 'recover' | 'in';

interface AuthState {
  auth: AuthScreen;
  userName: string;
  userEmail: string;
  recoverSent: boolean;
  doLogin: (email: string) => void;
  goRecover: () => void;
  goLogin: () => void;
  sendRecover: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      auth: 'login',
      userName: 'Fernando',
      userEmail: 'sistemas3@atiempo.com.co',
      recoverSent: false,

      doLogin: (email) => set({ auth: 'in', userEmail: email || 'sistemas3@atiempo.com.co' }),
      goRecover: () => set({ auth: 'recover', recoverSent: false }),
      goLogin: () => set({ auth: 'login' }),
      sendRecover: () => set({ recoverSent: true }),
      logout: () => set({ auth: 'login', recoverSent: false }),
    }),
    { name: 'kamban-auth' },
  ),
);
