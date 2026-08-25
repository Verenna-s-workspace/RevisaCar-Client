import { describe, it, expect } from 'vitest';
import { dashboardApi, vehiclesApi, estimatesApi, plateApi } from './api';

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

  it('lookup de placa devolve o envelope {available, found, vehicle}', async () => {
    const hit = await plateApi.lookup('ABC1D23');
    expect(hit.data.found).toBe(true);
    expect(hit.data.vehicle?.brand).toBe('Hyundai');

    const miss = await plateApi.lookup('ZZZ0000');
    expect(miss.data.available).toBe(true);
    expect(miss.data.found).toBe(false);
    expect(miss.data.vehicle).toBeNull();
  });
});
