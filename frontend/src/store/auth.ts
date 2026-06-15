import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomerSession } from '../types';

// Bypass login for local development when VITE_BYPASS_LOGIN=true
const BypassLogin = import.meta.env.VITE_BYPASS_LOGIN === 'true';
const DevSession: CustomerSession = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@local',
  access: 'dev-access-token',
  refresh: 'dev-refresh-token',
};

if (BypassLogin) {
  try {
    if (!localStorage.getItem('customer_session')) {
      localStorage.setItem('customer_session', JSON.stringify(DevSession));
    }
  } catch {}
}

interface AuthState {
  session: CustomerSession | null;
  setSession: (s: CustomerSession) => void;
  clearSession: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: BypassLogin ? DevSession : null,
      isAuthenticated: BypassLogin ? true : false,
      setSession: (session) => {
        // Also write to localStorage for axios interceptor
        localStorage.setItem('customer_session', JSON.stringify(session));
        set({ session, isAuthenticated: true });
      },
      clearSession: () => {
        localStorage.removeItem('customer_session');
        set({ session: null, isAuthenticated: false });
      },
    }),
    {
      name: 'revisacar-auth',
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
);
