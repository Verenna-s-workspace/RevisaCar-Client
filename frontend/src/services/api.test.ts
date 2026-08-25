import { describe, it, expect } from 'vitest';
import { dashboardApi, vehiclesApi, estimatesApi } from './api';

// Prova que a camada de rede pura (sem ramos BYPASS) é atendida pelo MSW —
// os mesmos mocks do modo dev/showcase, agora interceptados na rede.
describe('api ↔ MSW', () => {
  it('dashboard vem do handler mockado', async () => {
    const { data } = await dashboardApi.get();
    expect(data.vehicles_count).toBe(2);
    expect(data.active_vehicle?.plate).toBe('ABC-1234');
  });

  it('lista de veículos vem do store mockado', async () => {
    const { data } = await vehiclesApi.list();
    expect(data.map(v => v.brand)).toContain('Fiat');
    expect(data.length).toBeGreaterThanOrEqual(3);
  });

  it('aprovar orçamento muda o status', async () => {
    const { data } = await estimatesApi.approve('est-001', 'ok pode fazer');
    expect((data as any).status).toBe('aprovado');
  });
});
