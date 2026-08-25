import { Component, type ReactNode } from 'react';
import { captureError } from '../lib/observability';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Captura erros de render em qualquer tela e mostra um fallback amigável em vez
 * da tela branca (que acontecia antes). Reporta o erro para a observabilidade.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    captureError(error, { componentStack: info.componentStack });
  }

  private reset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'var(--bg, #F7F6F3)', fontFamily: 'var(--font, sans-serif)',
      }}>
        <div style={{
          maxWidth: 340, textAlign: 'center', background: '#fff', borderRadius: 24,
          padding: '32px 24px', border: '1px solid var(--border, #E2DFD8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand-tint, rgba(204,20,0,0.06))',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                 stroke="var(--brand, #CC1400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text, #14161A)', margin: '0 0 8px' }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted, #6B7078)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Tivemos um problema ao carregar esta tela. Já registramos o ocorrido. Tente voltar ao início.
          </p>
          <button onClick={this.reset} style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none',
            background: 'var(--brand, #CC1400)', color: '#fff', fontSize: '1rem',
            fontWeight: 700, cursor: 'pointer',
          }}>
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }
}
