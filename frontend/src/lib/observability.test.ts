import { describe, it, expect, vi } from 'vitest';
import { initObservability, captureError, registerGlobalErrorHandlers } from './observability';

describe('observability', () => {
  it('initObservability é no-op sem VITE_SENTRY_DSN (não lança)', async () => {
    // sem DSN no ambiente de teste -> retorna sem inicializar Sentry
    await expect(initObservability()).resolves.toBeUndefined();
  });

  it('captureError sem Sentry cai para console.error (não some silenciosamente)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    captureError(err, { screen: 'Dashboard' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('registerGlobalErrorHandlers é idempotente e não lança', () => {
    expect(() => { registerGlobalErrorHandlers(); registerGlobalErrorHandlers(); }).not.toThrow();
  });
});
