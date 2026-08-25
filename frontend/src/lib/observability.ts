/**
 * Observabilidade opcional. O Sentry só é carregado (chunk separado) se houver
 * VITE_SENTRY_DSN — em dev/sem DSN, cai para console e zero overhead no bundle.
 */
type SentryModule = typeof import('@sentry/react');
let sentry: SentryModule | null = null;

export async function initObservability(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      // não capturar dados sensíveis do usuário por padrão
      sendDefaultPii: false,
    });
    sentry = Sentry;
  } catch (e) {
    console.warn('[observability] Sentry não pôde ser inicializado:', e);
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) {
    sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    // fallback: pelo menos não some silenciosamente
    // eslint-disable-next-line no-console
    console.error('[unhandled]', error, context ?? '');
  }
}
