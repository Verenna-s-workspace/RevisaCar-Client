/**
 * Dados de mock do modo dev/showcase (VITE_BYPASS_LOGIN=true) e dos testes.
 * Antes viviam inline em services/api.ts como ramos `BYPASS ? ...`. Agora ficam
 * aqui e são servidos pela camada MSW (mocks/handlers.ts) — o api.ts voltou a ser
 * uma camada de rede pura. Os *Store abaixo guardam estado entre chamadas.
 */
import type {
  Vehicle, CustomerProfile, DashboardSummary, ServiceHistory,
  Notification, VehicleHealth, VehicleDocument, InspectionReport,
} from '../types';

// ── Estimates ──────────────────────────────────────────────────────────────────
export const mockEstimate = {
  id: 'est-001',
  number: 'ORC-2026-0001',
  customer_id: 'dev-user',
  vehicle_id: 'v1',
  vehicle_label: 'Fiat Uno 2018 · ABC-1234',
  appointment_id: 'appt-001',
  items: [
    { id: 'item-1', description: 'Troca de óleo + filtro', quantity: 1, unit_price: 180, item_type: 'mao_de_obra', subtotal: 180 },
    { id: 'item-2', description: 'Filtro de ar', quantity: 1, unit_price: 65, item_type: 'peca', subtotal: 65 },
  ],
  subtotal: 245,
  discount: 0,
  total: 245,
  status: 'pendente',
  notes: 'Orçamento enviado para aprovação do cliente.',
  valid_until: '2026-06-30',
  created_at: '2026-06-18T09:30:00Z',
};

export const mockEstimateSecond = {
  id: 'est-002',
  number: 'ORC-2026-0002',
  customer_id: 'dev-user',
  vehicle_id: 'v2',
  vehicle_label: 'Honda Civic 2020 · DEF-5678',
  appointment_id: 'appt-002',
  items: [
    { id: 'item-3', description: 'Revisão completa de freios', quantity: 1, unit_price: 320, item_type: 'mao_de_obra', subtotal: 320 },
    { id: 'item-4', description: 'Pastilhas traseiras', quantity: 1, unit_price: 210, item_type: 'peca', subtotal: 210 },
  ],
  subtotal: 530,
  discount: 25,
  total: 505,
  status: 'pendente',
  notes: 'Aguardando aprovação do cliente para iniciar os serviços.',
  valid_until: '2026-07-05',
  created_at: '2026-06-19T10:15:00Z',
};

export const mockEstimateStore = {
  estimates: [mockEstimate, mockEstimateSecond],
};

export const cloneEstimate = (estimate: typeof mockEstimate) => JSON.parse(JSON.stringify(estimate));

// ── Profile ────────────────────────────────────────────────────────────────────
export const mockProfile: CustomerProfile = {
  id: 'dev-user', name: 'João Silva', email: 'joao.silva@email.com',
  phone: '(11) 99999-9999', cpf: '123.456.789-00', created_at: '2024-01-01T00:00:00Z',
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const mockDashboard: DashboardSummary = {
  vehicles_count: 2,
  active_vehicle: {
    id: 'v1', customer_id: 'dev-user', brand: 'Fiat', model: 'Uno', year: 2018,
    plate: 'ABC-1234', color: 'Prata', fuel_type: 'flex', mileage: 45230,
    vin: undefined, renavam: undefined, is_active: true,
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  upcoming_appointments: [],
  pending_estimates_count: 2,
  pending_estimates: [
    {
      id: 'est-001', number: 'ORC-2026-0001', customer_id: 'dev-user', vehicle_id: 'v1',
      vehicle_label: 'Fiat Uno 2018 · ABC-1234', appointment_id: 'appt-001',
      items: [
        { id: 'item-1', description: 'Troca de óleo + filtro', quantity: 1, unit_price: 180, item_type: 'mao_de_obra', subtotal: 180 },
        { id: 'item-2', description: 'Filtro de ar', quantity: 1, unit_price: 65, item_type: 'peca', subtotal: 65 },
      ],
      subtotal: 245, discount: 0, total: 245, status: 'pendente',
      notes: 'Orçamento enviado para aprovação do cliente.',
      valid_until: '2026-06-30', created_at: '2026-06-18T09:30:00Z',
    },
    {
      id: 'est-002', number: 'ORC-2026-0002', customer_id: 'dev-user', vehicle_id: 'v2',
      vehicle_label: 'Honda Civic 2020 · DEF-5678', appointment_id: 'appt-002',
      items: [
        { id: 'item-3', description: 'Revisão completa de freios', quantity: 1, unit_price: 320, item_type: 'mao_de_obra', subtotal: 320 },
        { id: 'item-4', description: 'Pastilhas traseiras', quantity: 1, unit_price: 210, item_type: 'peca', subtotal: 210 },
      ],
      subtotal: 530, discount: 25, total: 505, status: 'pendente',
      notes: 'Aguardando aprovação do cliente para iniciar os serviços.',
      valid_until: '2026-07-05', created_at: '2026-06-19T10:15:00Z',
    },
  ],
  unread_notifications_count: 1,
  recent_notifications: [
    { id: 'n1', title: 'Bem-vindo ao RevisaCar!', message: 'Gerencie seu veículo em um só lugar.', type: 'sistema', is_read: false, created_at: new Date().toISOString() },
  ],
  urgent_reminders: [
    { id: 'r1', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', service_name: 'Troca de Óleo', interval_km: 5000, last_service_km: 40000, next_service_km: 45000, current_mileage: 45230, km_remaining: -230, urgency: 'urgente', progress_pct: 100 },
    { id: 'r2', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', service_name: 'Filtro de Ar', interval_km: 10000, last_service_km: 38000, next_service_km: 48000, current_mileage: 45230, km_remaining: 2770, urgency: 'atencao', progress_pct: 72 },
    { id: 'r3', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', service_name: 'Revisão Preventiva', interval_km: 10000, last_service_km: 40000, next_service_km: 50000, current_mileage: 45230, km_remaining: 4770, urgency: 'ok', progress_pct: 52 },
  ],
  all_reminders: [],
  recent_services: [
    {
      id: 'svc-1', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
      service_date: '2026-05-10', scheduled_date: '2026-05-10T10:00:00Z',
      mileage_at_service: 43000, service_type: 'Troca de Óleo',
      status: 'completed', workshop_name: 'Auto Center Verenna',
      items: [{ description: 'Óleo 5W30 + filtro', part_replaced: true, part_name: 'Filtro de óleo' }],
      total_cost: 180, mechanic_notes: 'Troca realizada sem intercorrências.', created_at: '2026-05-10T10:00:00Z',
    },
    {
      id: 'svc-2', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
      service_date: '2026-03-22', scheduled_date: '2026-03-22T14:30:00Z',
      mileage_at_service: 40500, service_type: 'Revisão de Freios',
      status: 'completed', workshop_name: 'Auto Center Verenna',
      items: [{ description: 'Pastilhas dianteiras', part_replaced: true, part_name: 'Pastilha de freio' }],
      total_cost: 320, mechanic_notes: 'Pastilhas traseiras com 40% restantes.', created_at: '2026-03-22T14:30:00Z',
    },
    {
      id: 'svc-3', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
      service_date: '2026-01-08', scheduled_date: '2026-01-08T09:00:00Z',
      mileage_at_service: 38000, service_type: 'Alinhamento e Balanceamento',
      status: 'completed', workshop_name: 'Auto Center Verenna',
      items: [{ description: 'Alinhamento 4 rodas + balanceamento', part_replaced: false }],
      total_cost: 120, mechanic_notes: '', created_at: '2026-01-08T09:00:00Z',
    },
  ],
};

// ── Vehicles ───────────────────────────────────────────────────────────────────
export const mockVehicleStore: { vehicles: Vehicle[] } = {
  vehicles: [
    { id: 'v1', customer_id: 'dev-user', brand: 'Fiat', model: 'Uno', year: 2018, plate: 'ABC-1234', color: 'Prata', fuel_type: 'flex', mileage: 45230, renavam: '01234567890', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 'v2', customer_id: 'dev-user', brand: 'Honda', model: 'Civic', year: 2020, plate: 'DEF-5678', color: 'Preto', fuel_type: 'flex', mileage: 32000, renavam: '09876543210', is_active: false, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'v3', customer_id: 'dev-user', brand: 'Toyota', model: 'Corolla', year: 2019, plate: 'GHI-9012', color: 'Branco', fuel_type: 'flex', mileage: 58000, renavam: '05554443332', is_active: false, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  ],
};

// ── Availability ───────────────────────────────────────────────────────────────
export function makeAvailableDates(year: number, month: number) {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // dias úteis
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${dd}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export const DEFAULT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// ── History + Inspections ────────────────────────────────────────────────────────
export const mockHistory: ServiceHistory[] = [
  {
    id: 'svc-1', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
    service_date: '2026-05-10', scheduled_date: '2026-05-10T10:00:00Z', mileage_at_service: 44000,
    service_type: 'Troca de óleo e filtros', workshop_name: 'RevisaCar · Centro',
    items: [
      { description: 'Óleo 5W30 (4L)', part_replaced: true, part_name: 'Óleo sintético' },
      { description: 'Filtro de óleo', part_replaced: true, part_name: 'Filtro de óleo' },
      { description: 'Filtro de ar', part_replaced: true, part_name: 'Filtro de ar' },
      { description: 'Mão de obra', part_replaced: false },
    ],
    total_cost: 310, mechanic_notes: 'Troca realizada sem intercorrências. Próxima troca em 5.000 km.',
    inspection_id: 'insp-1', warranty_until: '2026-08-08', created_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 'svc-2', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
    service_date: '2026-02-10', scheduled_date: '2026-02-10T14:30:00Z', mileage_at_service: 42000,
    service_type: 'Alinhamento e balanceamento', workshop_name: 'RevisaCar · Centro',
    items: [
      { description: 'Alinhamento 4 rodas', part_replaced: false },
      { description: 'Balanceamento', part_replaced: false },
    ],
    total_cost: 160, mechanic_notes: 'Geometria ajustada. Pneus dianteiros com desgaste leve.',
    created_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 'svc-3', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
    service_date: '2025-12-15', scheduled_date: '2025-12-15T09:00:00Z', mileage_at_service: 40000,
    service_type: 'Revisão preventiva', workshop_name: 'RevisaCar · Centro',
    items: [
      { description: 'Inspeção de 50 itens', part_replaced: false },
      { description: 'Velas de ignição', part_replaced: true, part_name: 'Velas NGK' },
      { description: 'Fluido de freio', part_replaced: true, part_name: 'DOT 4' },
    ],
    total_cost: 250, mechanic_notes: 'Revisão completa. Recomendada troca de pastilhas em ~6.000 km.',
    inspection_id: 'insp-3', created_at: '2025-12-15T09:00:00Z',
  },
];

export const mockInspections: Record<string, InspectionReport> = {
  'insp-1': {
    id: 'insp-1', service_id: 'svc-1', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
    date: '2026-05-10', mileage: 44000, inspector: 'Carlos Mendes', overall_score: 86,
    items: [
      { name: 'Óleo do motor', status: 'ok', note: 'Trocado nesta visita' },
      { name: 'Filtros (óleo/ar)', status: 'ok', note: 'Substituídos' },
      { name: 'Freios dianteiros', status: 'ok', note: 'Pastilhas com 70%' },
      { name: 'Freios traseiros', status: 'atencao', note: 'Lonas com 35% — trocar em ~6.000 km' },
      { name: 'Pneus', status: 'atencao', note: 'Dianteiros com desgaste irregular' },
      { name: 'Suspensão', status: 'ok' },
      { name: 'Bateria', status: 'ok', note: '12,6V — boa' },
      { name: 'Fluidos e arrefecimento', status: 'ok' },
    ],
    photos: ['Motor', 'Freio dianteiro', 'Pneu dianteiro', 'Painel'],
    recommendations: ['Trocar pastilhas/lonas traseiras nos próximos 6.000 km', 'Rodízio de pneus na próxima visita'],
  },
  'insp-3': {
    id: 'insp-3', service_id: 'svc-3', vehicle_label: 'Fiat Uno 2018 · ABC-1234',
    date: '2025-12-15', mileage: 40000, inspector: 'Ana Souza', overall_score: 78,
    items: [
      { name: 'Velas de ignição', status: 'ok', note: 'Trocadas' },
      { name: 'Fluido de freio', status: 'ok', note: 'Trocado (DOT 4)' },
      { name: 'Correia dentada', status: 'atencao', note: 'Verificar na próxima revisão' },
      { name: 'Sistema de arrefecimento', status: 'ok' },
      { name: 'Pneus', status: 'critico', note: 'Dianteiros próximos do limite (TWI)' },
      { name: 'Amortecedores', status: 'ok' },
    ],
    photos: ['Velas', 'Correia', 'Pneu'],
    recommendations: ['Substituir pneus dianteiros com urgência', 'Avaliar correia dentada na revisão dos 50.000 km'],
  },
};

// ── Notifications ────────────────────────────────────────────────────────────────
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
export const mockNotifStore: { items: Notification[] } = {
  items: [
    { id: 'nt-1', title: 'Agendamento confirmado', message: 'Sua troca de óleo está confirmada para 12/04 às 14:00 na RevisaCar · Centro. Chegue com 10 minutos de antecedência.', type: 'agendamento', is_read: false, created_at: hoursAgo(2), action_url: '/acompanhar' },
    { id: 'nt-2', title: 'Orçamento aprovado', message: 'O orçamento OS #1258 (Troca de óleo + filtros) foi aprovado. A oficina já foi notificada e iniciará o serviço.', type: 'orcamento', is_read: false, created_at: hoursAgo(5), action_url: '/orcamentos' },
    { id: 'nt-3', title: 'Lembrete de revisão', message: 'Sua revisão preventiva está próxima — faltam cerca de 1.200 km. Que tal já agendar?', type: 'lembrete', is_read: true, created_at: hoursAgo(28), action_url: '/agendar' },
    { id: 'nt-4', title: 'Promoção da semana', message: '10% de desconto em alinhamento e balanceamento nesta semana nas oficinas parceiras.', type: 'sistema', is_read: true, created_at: hoursAgo(50) },
  ],
};

// ── Vehicle Health ────────────────────────────────────────────────────────────────
export const mockHealth: Record<string, VehicleHealth> = {
  v1: {
    vehicle_id: 'v1', overall_score: 78, last_updated: new Date().toISOString(),
    categories: [
      { name: 'Motor', score: 85, icon: '⚙️' },
      { name: 'Freios', score: 58, icon: '🛑' },
      { name: 'Pneus', score: 72, icon: '⭕' },
      { name: 'Suspensão', score: 80, icon: '🔧' },
      { name: 'Elétrica', score: 90, icon: '⚡' },
      { name: 'Ar-cond.', score: 88, icon: '❄️' },
    ],
  },
};

// ── Documents ────────────────────────────────────────────────────────────────────
export const mockDocuments: VehicleDocument[] = [
  { id: 'd1', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', type: 'crlv', title: 'CRLV 2026', file_url: '', file_name: 'crlv-2026.pdf', file_size_kb: 420, expiry_date: '2026-12-31', created_at: '2026-01-10T00:00:00Z' },
  { id: 'd2', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', type: 'seguro', title: 'Seguro Porto 2026', file_url: '', file_name: 'seguro-porto.pdf', file_size_kb: 890, expiry_date: '2027-01-15', created_at: '2026-01-15T00:00:00Z' },
  { id: 'd3', vehicle_id: 'v1', vehicle_label: 'Fiat Uno 2018 · ABC-1234', type: 'nota_fiscal', title: 'NF Troca de Óleo', file_url: '', file_name: 'nf-oleo-abr24.pdf', file_size_kb: 150, created_at: '2024-04-12T00:00:00Z' },
];
