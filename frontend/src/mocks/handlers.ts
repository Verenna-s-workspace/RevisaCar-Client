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
  mockHealth, mockDocuments, mockPlateDb, mockOficinaStore, mockOrcamentos, MOCK_CONVITE,
} from './data';

const P = '*/customer';

export const handlers = [
  // ── Profile ──────────────────────────────────────────────────────────────────
  http.get(`${P}/me`, () => HttpResponse.json(mockProfile)),
  http.patch(`${P}/me`, async ({ request }) => {
    Object.assign(mockProfile, await request.json() as object);
    return HttpResponse.json(mockProfile);
  }),
  http.post(`${P}/me/change-password`, () => HttpResponse.json({ detail: 'Senha alterada com sucesso', access: 'dev-access-token' })),
  http.post(`${P}/me/logout-all`, () => HttpResponse.json({ detail: 'Todas as outras sessões foram encerradas', access: 'dev-access-token' })),
  http.post(`${P}/me/delete`, () => HttpResponse.json({ detail: 'Conta excluída' })),
  http.get(`${P}/me/export`, () => HttpResponse.json({ perfil: mockProfile, veiculos: mockVehicleStore.vehicles })),

  // ── Oficinas + orçamentos da oficina ────────────────────────────────────────
  http.get(`${P}/oficinas`, () => HttpResponse.json(mockOficinaStore.oficinas)),
  http.post(`${P}/oficinas/convite`, async ({ request }) => {
    const { codigo } = await request.json() as { codigo: string };
    if (codigo !== MOCK_CONVITE) {
      return HttpResponse.json({ detail: 'Convite inválido ou cancelado.', codigo: 'convite_invalido' }, { status: 400 });
    }
    const oficina = { oficina_doc: '44555666000199', nome: 'Mecânica Bairro', desde: new Date().toISOString() };
    const novo = !mockOficinaStore.oficinas.some(o => o.oficina_doc === oficina.oficina_doc);
    if (novo) mockOficinaStore.oficinas.push(oficina);
    return HttpResponse.json({ ok: true, codigo: 'vinculado', novo, oficina: { oficina_doc: oficina.oficina_doc, nome: oficina.nome } },
                             { status: novo ? 201 : 200 });
  }),
  http.get(`${P}/orcamentos`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    return HttpResponse.json(mockOrcamentos.filter(o => !status || o.status === status));
  }),
  http.get(`${P}/orcamentos/:id`, ({ params }) => {
    const o = mockOrcamentos.find(x => x.id === params.id);
    return o ? HttpResponse.json(o) : HttpResponse.json({ detail: 'Orçamento não encontrado' }, { status: 404 });
  }),

  // ── Agendamentos ─────────────────────────────────────────────────────────────
  http.post(`${P}/appointments`, async ({ request }) => {
    const data = await request.json() as Record<string, string>;
    if (!data.oficina_doc) return HttpResponse.json({ oficina_doc: 'Escolha a oficina do agendamento.' }, { status: 422 });
    return HttpResponse.json({ id: 'a-' + Date.now(), status: 'pendente', ...data }, { status: 201 });
  }),

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
  // Consulta de placa (mock do provedor) — envelope {available, found, vehicle}.
  http.get(`${P}/plate-lookup`, ({ request }) => {
    const raw = new URL(request.url).searchParams.get('plate') ?? '';
    const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hit = mockPlateDb[key];
    return HttpResponse.json({ available: true, found: !!hit, vehicle: hit ? { ...hit, plate: key } : null });
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
    // Igual ao backend: "HH:MM:SS".
    return HttpResponse.json({ date, times: DEFAULT_TIMES.map(t => `${t}:00`) });
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

  // ── Web Push (dev: desabilitado por padrão, sem chaves VAPID) ─────────────────
  http.get(`${P}/push/public-key`, () => HttpResponse.json({ enabled: false, publicKey: '' })),
  http.post(`${P}/push/subscribe`, () => HttpResponse.json({ detail: 'Inscrito' }, { status: 201 })),
  http.post(`${P}/push/unsubscribe`, () => HttpResponse.json({ detail: 'Cancelado' })),

  // ── Documents ────────────────────────────────────────────────────────────────
  http.get(`${P}/documents`, ({ request }) => {
    const vehicleId = new URL(request.url).searchParams.get('vehicle_id');
    return HttpResponse.json(vehicleId ? mockDocuments.filter(d => d.vehicle_id === vehicleId) : mockDocuments);
  }),
  http.post(`${P}/documents`, async ({ request }) => {
    const fd = await request.formData();
    const file = fd.get('file') as File | null;
    const v = mockVehicleStore.vehicles.find(x => x.id === fd.get('vehicle_id')) ?? mockVehicleStore.vehicles[0];
    const id = 'd' + Date.now();
    const doc = {
      id, vehicle_id: v.id, vehicle_label: `${v.brand} ${v.model}`, type: String(fd.get('type')) as 'crlv',
      title: String(fd.get('title')), file_name: file?.name ?? '', has_file: !!file,
      file_url: file ? `/customer/documents/${id}/arquivo` : '',
      expiry_date: (fd.get('expiry_date') as string) || undefined, created_at: new Date().toISOString(),
    };
    mockDocuments.unshift(doc);
    return HttpResponse.json(doc, { status: 201 });
  }),
  http.get(`${P}/documents/:id/arquivo`, () =>
    new HttpResponse(new Blob(['%PDF-1.4 documento de exemplo'], { type: 'application/pdf' }), {
      headers: { 'Content-Type': 'application/pdf' },
    })),
  http.delete(`${P}/documents/:id`, ({ params }) => {
    const i = mockDocuments.findIndex(d => d.id === params.id);
    if (i >= 0) mockDocuments.splice(i, 1);
    return HttpResponse.json({ detail: 'Documento removido' });
  }),
];
