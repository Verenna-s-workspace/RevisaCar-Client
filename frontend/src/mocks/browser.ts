import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Worker do MSW usado no browser quando VITE_BYPASS_LOGIN=true (dev/showcase).
export const worker = setupWorker(...handlers);
