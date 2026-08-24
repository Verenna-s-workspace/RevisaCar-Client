import { describe, it, expect, beforeEach } from 'vitest';
import { useScheduleStore } from './schedule';

describe('useScheduleStore (wizard de agendamento)', () => {
  beforeEach(() => {
    useScheduleStore.getState().reset();
  });

  it('começa no passo 1 com campos vazios', () => {
    const { wizard } = useScheduleStore.getState();
    expect(wizard.step).toBe(1);
    expect(wizard.vehicleId).toBe('');
    expect(wizard.timeSlot).toBe('');
  });

  it('setStep muda o passo sem apagar os campos', () => {
    useScheduleStore.getState().setField('vehicleId', 'v1');
    useScheduleStore.getState().setStep(3);
    const { wizard } = useScheduleStore.getState();
    expect(wizard.step).toBe(3);
    expect(wizard.vehicleId).toBe('v1'); // preservado
  });

  it('setField atualiza só o campo informado', () => {
    useScheduleStore.getState().setField('serviceType', 'Revisão');
    useScheduleStore.getState().setField('date', '2026-09-01');
    const { wizard } = useScheduleStore.getState();
    expect(wizard.serviceType).toBe('Revisão');
    expect(wizard.date).toBe('2026-09-01');
    expect(wizard.notes).toBe('');
  });

  it('reset volta ao estado inicial', () => {
    const s = useScheduleStore.getState();
    s.setField('vehicleId', 'v9');
    s.setStep(4);
    s.reset();
    const { wizard } = useScheduleStore.getState();
    expect(wizard.step).toBe(1);
    expect(wizard.vehicleId).toBe('');
  });
});
