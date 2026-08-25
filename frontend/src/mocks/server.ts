import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Server do MSW usado nos testes (Vitest / ambiente node).
export const server = setupServer(...handlers);
