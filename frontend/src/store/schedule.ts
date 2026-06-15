import { create } from 'zustand';
import type { ScheduleWizardState } from '../types';

interface ScheduleStore {
  wizard: ScheduleWizardState;
  setStep: (step: ScheduleWizardState['step']) => void;
  setField: <K extends keyof ScheduleWizardState>(key: K, value: ScheduleWizardState[K]) => void;
  reset: () => void;
}

const initial: ScheduleWizardState = {
  step: 1,
  vehicleId: '',
  serviceType: '',
  serviceDescription: '',
  date: '',
  timeSlot: '',
  notes: '',
};

export const useScheduleStore = create<ScheduleStore>((set) => ({
  wizard: { ...initial },
  setStep: (step) => set((s) => ({ wizard: { ...s.wizard, step } })),
  setField: (key, value) => set((s) => ({ wizard: { ...s.wizard, [key]: value } })),
  reset: () => set({ wizard: { ...initial } }),
}));
