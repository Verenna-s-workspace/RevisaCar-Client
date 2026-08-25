import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';
import type { CustomerSession } from '../types';

const session: CustomerSession = {
  id: 'c1', name: 'Ana', email: 'ana@x.com', access: 'acc', refresh: 'ref',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    localStorage.clear();
  });

  it('começa deslogado', () => {
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('setSession autentica e espelha no localStorage (p/ o interceptor do axios)', () => {
    useAuthStore.getState().setSession(session);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.session?.email).toBe('ana@x.com');
    expect(JSON.parse(localStorage.getItem('customer_session')!).access).toBe('acc');
  });

  it('clearSession desloga e limpa o localStorage', () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('customer_session')).toBeNull();
  });
});
