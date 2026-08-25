// Mock mínimo de localStorage para rodar os testes em ambiente 'node' — o
// store de auth usa o middleware persist do zustand, que lê/grava localStorage.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

// Sempre instala o mock (o localStorage experimental do Node em versões novas
// exige um arquivo e emite warning — o mock em memória é determinístico).
Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

// MSW: mesma camada de mock do dev, disponível nos testes. Requisições não
// mapeadas passam direto (bypass), então testes que não tocam rede não mudam.
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
