/**
 * Handlers MSW do modo dev/showcase (VITE_BYPASS_LOGIN=true) e dos testes.
 * Reproduzem 1:1 os antigos ramos `BYPASS ? Promise.resolve(...)` do api.ts.
 * O prefixo curinga (P, abaixo) casa com qualquer origin — localhost:8000/8001
 * ou o VITE_API_URL configurado. Endpoints sem handler (agendamentos, lembretes,
 * upload de documento) seguem para a rede real, como já era antes (sem ramo BYPASS).
 */
import { http, HttpResponse } from 'msw';
import type { Vehicle, VehicleFormData } from '../types';
import {
  mockProfile, mockDashboard, mockVehicleStore, mockEstimateStore, cloneEstimate,
  makeAvailableDates, DEFAULT_TIMES, mockHistory, mockInspections, mockNotifStore,
  mockHealth, mockDocuments,
} from './data';

const P = '*/customer';

export const handlers = [
  // ── Profile ──────────────────────────────────────────────────────────────────
  http.get(`${P}/me`, () => HttpResponse.json(mockProfile)),
  http.patch(`${P}/me`, async ({ request }) => {
    Object.assign(mockProfile, await request.json() as object);
    return HttpResponse.json(mockProfile);
  }),
  http.post(`${P}/me/change-password`, () => HttpResponse.json({})),

  // ── Dashboard ────────────────────────────────────────────────────────────────
  http.get(`${P}/dashboard`, () => HttpResponse.json(mockDashboard)),

  // ── Vehicles (específicos antes do :id) ────────────────────────────────────────
  http.get(`${P}/vehicles/:id/health`, ({ params }) => {
    const id = params.id as string;
    return HttpResponse.json(mockHealth[id] || mockHealth['v1']);
  }),
  http.get(`${P}/vehicles/:id/qr`, ({ params }) => {
    const id = params.id as string;
    return HttpResponse.json({ uuid: `rc-${id}-550e8400-e29b-41d4-a716`, vehicle_id: id, created_at: new Date().toISOString(), is_active: true });
  }),
  http.post(`${P}/vehicles/:id/qr/refresh`, ({ params }) => {
    const id = params.id as string;
    return HttpResponse.json({ uuid: `rc-${id}-${Date.now()}`, vehicle_id: id, created_at: new Date().toISOString(), is_active: true });
  }),
  http.get(`${P}/vehicles`, () => HttpResponse.json(mockVehicleStore.vehicles)),
  http.get(`${P}/vehicles/:id`, ({ params }) => {
    const v = mockVehicleStore.vehicles.find(x => x.id === params.id) ?? mockVehicleStore.vehicles[0];
    return HttpResponse.json(v);
  }),
  http.post(`${P}/vehicles`, async ({ request }) => {
    const data = await request.json() as VehicleFormData;
    const v: Vehicle = {
      ...data, id: 'v' + (mockVehicleStore.vehicles.length + 1), customer_id: 'dev-user',
      is_active: mockVehicleStore.vehicles.length === 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    mockVehicleStore.vehicles.push(v);
    return HttpResponse.json(v);
  }),
  http.patch(`${P}/vehicles/:id`, async ({ params, request }) => {
    const v = mockVehicleStore.vehicles.find(x => x.id === params.id);
    if (v) Object.assign(v, await request.json() as object, { updated_at: new Date().toISOString() });
    return HttpResponse.json(v ?? mockVehicleStore.vehicles[0]);
  }),
  http.delete(`${P}/vehicles/:id`, ({ params }) => {
    mockVehicleStore.vehicles = mockVehicleStore.vehicles.filter(v => v.id !== params.id);
    return HttpResponse.json({});
  }),

  // ── Availability ───────────────────────────────────────────────────────────────
  http.get(`${P}/availability`, ({ request }) => {
    const url = new URL(request.url);
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    return HttpResponse.json({ year, month, available_dates: makeAvailableDates(year, month) });
  }),
  http.get(`${P}/availability/times`, ({ request }) => {
    const date = new URL(request.url).searchParams.get('date') ?? '';
    return HttpResponse.json({ date, times: DEFAULT_TIMES });
  }),

  // ── Estimates ────────────────────────────────────────────────────────────────
  http.get(`${P}/estimates`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const items = mockEstimateStore.estimates
      .filter(item => !status || item.status === status)
      .map(item => cloneEstimate(item));
    return HttpResponse.json(items);
  }),
  http.get(`${P}/estimates/:id`, ({ params }) => {
    const estimate = mockEstimateStore.estimates.find(item => item.id === params.id);
    return HttpResponse.json(estimate ? cloneEstimate(estimate) : null);
  }),
  http.post(`${P}/estimates/:id`, async ({ params, request }) => {
    const estimate = mockEstimateStore.estimates.find(item => item.id === params.id);
    if (!estimate) return HttpResponse.json({ detail: 'Orçamento não encontrado' }, { status: 404 });
    const { action, comment } = await request.json() as { action?: string; comment?: string };
    estimate.status = action === 'aprovar' ? 'aprovado' : 'rejeitado';
    if (comment) estimate.notes = comment;
    return HttpResponse.json(cloneEstimate(estimate));
  }),

  // ── History + Inspections ────────────────────────────────────────────────────────
  http.get(`${P}/history`, ({ request }) => {
    const vehicleId = new URL(request.url).searchParams.get('vehicle_id');
    return HttpResponse.json(vehicleId ? mockHistory.filter(h => h.vehicle_id === vehicleId) : mockHistory);
  }),
  http.get(`${P}/history/:id`, ({ params }) => {
    return HttpResponse.json(mockHistory.find(h => h.id === params.id) ?? mockHistory[0]);
  }),
  http.get(`${P}/inspections/:id`, ({ params }) => {
    const id = params.id as string;
    return HttpResponse.json(mockInspections[id] ?? mockInspections['insp-1']);
  }),

  // ── Notifications ────────────────────────────────────────────────────────────────
  http.get(`${P}/notifications`, ({ request }) => {
    const unread = new URL(request.url).searchParams.get('unread') === 'true';
    return HttpResponse.json(unread ? mockNotifStore.items.filter(n => !n.is_read) : mockNotifStore.items);
  }),
  http.get(`${P}/notifications/:id`, ({ params }) => {
    return HttpResponse.json(mockNotifStore.items.find(n => n.id === params.id) ?? mockNotifStore.items[0]);
  }),
  http.post(`${P}/notifications/read-all`, () => {
    mockNotifStore.items.forEach(n => { n.is_read = true; });
    return HttpResponse.json({});
  }),
  http.post(`${P}/notifications/:id/read`, ({ params }) => {
    const n = mockNotifStore.items.find(x => x.id === params.id);
    if (n) n.is_read = true;
    return HttpResponse.json({});
  }),

  // ── Documents ────────────────────────────────────────────────────────────────
  http.get(`${P}/documents`, ({ request }) => {
    const vehicleId = new URL(request.url).searchParams.get('vehicle_id');
    return HttpResponse.json(vehicleId ? mockDocuments.filter(d => d.vehicle_id === vehicleId) : mockDocuments);
  }),
];
