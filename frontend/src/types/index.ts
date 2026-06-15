// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access: string;
  refresh: string;
  customer_id: string;
  name: string;
}

export interface CustomerSession {
  id: string;
  name: string;
  email: string;
  access: string;
  refresh: string;
}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  address?: string;
  avatar_url?: string;
  created_at: string;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export type FuelType = 'flex' | 'gasolina' | 'etanol' | 'diesel' | 'eletrico' | 'gnv' | 'hibrido';

export interface Vehicle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  fuel_type: FuelType;
  mileage: number;
  vin?: string;
  renavam?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleFormData {
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  fuel_type: FuelType;
  mileage: number;
  vin?: string;
  renavam?: string;
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus = 'pendente' | 'confirmado' | 'rejeitado' | 'concluido' | 'cancelado';

export interface Appointment {
  id: string;
  customer_id: string;
  vehicle_id: string;
  vehicle_label: string;
  service_type: string;
  service_description?: string;
  date: string;
  time_slot: string;
  status: AppointmentStatus;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
}

// ── Estimate ──────────────────────────────────────────────────────────────────

export type EstimateStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'expirado';

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  item_type: 'peca' | 'mao_de_obra' | 'outro';
  subtotal: number;
}

export interface Estimate {
  id: string;
  number: string;
  customer_id: string;
  vehicle_id: string;
  vehicle_label: string;
  appointment_id?: string;
  items: EstimateItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: EstimateStatus;
  notes?: string;
  valid_until: string;
  created_at: string;
}

// ── Service History ───────────────────────────────────────────────────────────

export interface ServiceHistoryItem {
  description: string;
  part_replaced: boolean;
  part_name?: string;
}

export interface ServiceHistory {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  service_date: string;
  mileage_at_service: number;
  service_type: string;
  items: ServiceHistoryItem[];
  total_cost: number;
  mechanic_notes?: string;
  estimate_id?: string;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType = 'agendamento' | 'orcamento' | 'servico' | 'lembrete' | 'sistema';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

// ── Maintenance Reminder ──────────────────────────────────────────────────────

export type Urgency = 'ok' | 'atencao' | 'urgente';

export interface MaintenanceReminder {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  service_name: string;
  interval_km?: number;
  interval_months?: number;
  last_service_km?: number;
  last_service_date?: string;
  next_service_km?: number;
  next_service_date?: string;
  current_mileage: number;
  km_remaining?: number;
  urgency: Urgency;
  progress_pct: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  vehicles_count: number;
  active_vehicle: Vehicle | null;
  upcoming_appointments: Appointment[];
  pending_estimates_count: number;
  pending_estimates: Estimate[];
  unread_notifications_count: number;
  recent_notifications: Notification[];
  urgent_reminders: MaintenanceReminder[];
  all_reminders: MaintenanceReminder[];
}

// ── Schedule Wizard ───────────────────────────────────────────────────────────

export interface ScheduleWizardState {
  step: 1 | 2 | 3 | 4;
  vehicleId: string;
  serviceType: string;
  serviceDescription: string;
  date: string;
  timeSlot: string;
  notes: string;
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiError {
  detail?: string;
  [field: string]: unknown;
}
