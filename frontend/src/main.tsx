import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initObservability, registerGlobalErrorHandlers } from './lib/observability';

initObservability();
registerGlobalErrorHandlers();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

function render() {
  createRoot(root!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

// Modo dev/showcase sem backend: o MSW intercepta as chamadas e serve os mocks.
// Endpoints não mapeados seguem para a rede real (onUnhandledRequest: 'bypass').
async function bootstrap() {
  if (import.meta.env.VITE_BYPASS_LOGIN === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  render();
}

bootstrap();
