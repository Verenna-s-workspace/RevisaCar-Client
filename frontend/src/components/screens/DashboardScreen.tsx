import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ChevronDown, CalendarPlus, Plus, FolderOpen, QrCode, Store, Wrench,
  Calendar, ChevronRight, Gauge, ShieldCheck, Activity,
} from 'lucide-react';
import { format, subMonths, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  dashboardApi, oficinasApi, vehiclesApi, historyApi, remindersApi, orcamentosApi,
} from '../../services/api';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { MainLayout, Logo, Avatar } from '../layout';
import { Skeleton } from '../ui';
import { useAuthStore } from '../../store/auth';
import {
  Glass, StatTile, Chip, IconCircle, PriorityBadge, DotProgress, DotBars, DotRing, CardHeader, CarIllustration, V,
} from '../visual';
import type { MaintenanceReminder, Vehicle } from '../../types';

const dia = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const ORDEM: Record<string, number> = { urgente: 0, atencao: 1, ok: 2 };

/* ─── Seletor de veículo (pílula com lista) ─────────────── */
function SeletorVeiculo({ vehicles, atual, onChange }: { vehicles: Vehicle[]; atual?: Vehicle; onChange: (id: string) => void }) {
  const [aberto, setAberto] = useState(false);
  if (!atual) return null;
  return (
    <div className="relative">
      <button onClick={() => vehicles.length > 1 && setAberto(a => !a)} aria-expanded={aberto}
        className="chip h-9 pl-4 pr-3 rounded-full flex items-center gap-2 text-[13.5px] font-medium">
        {atual.brand} {atual.model}
        {vehicles.length > 1 && <ChevronDown size={15} color={V.brand} />}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setAberto(false)} />
          <div className="glass absolute left-0 top-11 z-30 min-w-[200px] rounded-2xl p-1.5">
            {vehicles.map(v => (
              <button key={v.id} onClick={() => { onChange(v.id); setAberto(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white">
                <p className="text-[13.5px] font-medium" style={{ color: V.text }}>{v.brand} {v.model}</p>
                <p className="text-[11.5px]" style={{ color: V.subtle }}>{v.plate}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Card principal do veículo ─────────────────────────── */
function CardVeiculo({ vehicles, vehicle, onChange }: { vehicles: Vehicle[]; vehicle?: Vehicle; onChange: (id: string) => void }) {
  const navigate = useNavigate();
  const { data: health } = useVehicleHealth(vehicle?.id);
  if (!vehicle) {
    return (
      <Glass className="p-6 flex flex-col items-center text-center gap-3 lg:col-span-5 lg:row-span-2">
        <CarIllustration className="w-full max-w-[320px] opacity-60" />
        <p className="text-[15px] font-medium" style={{ color: V.text }}>Cadastre seu primeiro veículo</p>
        <button onClick={() => navigate('/veiculos/novo')} className="chip-active h-10 px-5 rounded-full text-[13px] font-medium">
          Adicionar veículo
        </button>
      </Glass>
    );
  }
  // Saúde geral + as duas áreas que mais precisam de atenção (dados reais do backend).
  const areas = [...(health?.categories ?? [])].sort((a, b) => a.score - b.score).slice(0, 2);
  return (
    <Glass className="p-4 lg:p-5 flex flex-col lg:col-span-5 lg:row-span-2">
      <div className="flex items-center justify-between">
        <SeletorVeiculo vehicles={vehicles} atual={vehicle} onChange={onChange} />
        <IconCircle label="Ver detalhes do veículo" onClick={() => navigate(`/veiculo/${vehicle.id}`)}>
          <ArrowUpRight size={17} color={V.brand} />
        </IconCircle>
      </div>
      <p className="text-[12px] mt-2 px-1" style={{ color: V.subtle }}>
        {vehicle.year} · <span className="data-mono">{vehicle.plate}</span> · {vehicle.mileage?.toLocaleString('pt-BR')} km
      </p>
      <div className="flex-1 flex items-center justify-center py-2">
        <CarIllustration color={vehicle.color} title={`${vehicle.brand} ${vehicle.model}`} className="w-full max-w-[420px]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate(`/saude?veiculo=${vehicle.id}`)} className="text-left">
          <StatTile label="Saúde geral" value={health ? `${health.overall_score}%` : '—'} />
        </button>
        {areas.map(a => <StatTile key={a.name} label={a.name} value={`${a.score}%`} />)}
        {areas.length < 2 && Array.from({ length: 2 - areas.length }, (_, i) => <StatTile key={i} label="—" value="—" />)}
      </div>
    </Glass>
  );
}

/* ─── Custo de manutenção (histórico real, últimos 6 meses) ── */
function CardCusto({ className }: { className?: string }) {
  const { data: history = [] } = useQuery({ queryKey: ['history'], queryFn: () => historyApi.list().then(r => r.data), staleTime: 60_000 });
  const meses = useMemo(() => {
    const inicio = startOfMonth(subMonths(new Date(), 5));
    return Array.from({ length: 6 }, (_, i) => {
      const m = startOfMonth(subMonths(new Date(), 5 - i));
      const chave = format(m, 'yyyy-MM');
      const value = history
        .filter(h => h.service_date && dia(h.service_date) >= inicio && format(dia(h.service_date), 'yyyy-MM') === chave)
        .reduce((s, h) => s + (h.total_cost || 0), 0);
      return { label: format(m, 'MMM', { locale: ptBR }).replace('.', ''), value };
    });
  }, [history]);
  const total = meses.reduce((s, m) => s + m.value, 0);
  return (
    <Glass className={`p-5 ${className ?? ''}`}>
      <CardHeader title="Custo de manutenção" subtitle="Últimos 6 meses"
        right={<span className="text-[15px] font-medium tabular" style={{ color: V.text }}>{brl(total)}</span>} />
      <div className="mt-5">
        {total === 0
          ? <p className="text-[13px] py-10 text-center" style={{ color: V.subtle }}>Nenhum serviço pago nos últimos 6 meses.</p>
          : <DotBars data={meses} format={brl} height={140} />}
      </div>
    </Glass>
  );
}

/* ─── Próximos lembretes ────────────────────────────────── */
function CardLembretes({ lembretes, className }: { lembretes: MaintenanceReminder[]; className?: string }) {
  const navigate = useNavigate();
  return (
    <Glass className={`p-5 ${className ?? ''}`}>
      <CardHeader title={`Próximas manutenções${lembretes.length ? ` (${lembretes.length})` : ''}`} subtitle="Pelos lembretes do veículo"
        right={<IconCircle label="Ver manutenções" onClick={() => navigate('/manutencoes')}><ArrowUpRight size={16} color={V.brand} /></IconCircle>} />
      <div className="mt-4 flex flex-col gap-2">
        {lembretes.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: V.subtle }}>Tudo em dia por aqui.</p>
        ) : lembretes.slice(0, 4).map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: V.tile }}>
            <span className="w-2 h-2 rounded-full flex-none"
                  style={{ background: r.urgency === 'urgente' ? V.brand : r.urgency === 'atencao' ? V.warn : V.ok }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium truncate" style={{ color: V.text }}>{r.service_name}</p>
              <p className="text-[11.5px] truncate" style={{ color: V.subtle }}>
                {r.km_remaining != null
                  ? (r.km_remaining < 0 ? `Passou ${Math.abs(r.km_remaining).toLocaleString('pt-BR')} km` : `Em ${r.km_remaining.toLocaleString('pt-BR')} km`)
                  : r.next_service_date ? `Até ${format(dia(r.next_service_date), 'dd/MM')}` : r.vehicle_label}
              </p>
            </div>
            <PriorityBadge urgency={r.urgency} />
          </div>
        ))}
      </div>
    </Glass>
  );
}

/* ─── Dashboard ─────────────────────────────────────────── */
export function DashboardScreen() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const primeiroNome = session?.name?.split(' ')[0] ?? '';
  const [escolhido, setEscolhido] = useState<string>();

  const { data: dash, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get().then(r => r.data), staleTime: 30_000 });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
  const { data: oficinas } = useQuery({ queryKey: ['oficinas'], queryFn: () => oficinasApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: lembretesTodos = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: orcAguardando = [] } = useQuery({ queryKey: ['orcamentos', 'enviado'], queryFn: () => orcamentosApi.list('enviado').then(r => r.data), staleTime: 30_000 });
  const { data: history = [] } = useQuery({ queryKey: ['history'], queryFn: () => historyApi.list().then(r => r.data), staleTime: 60_000 });

  const vehicle = vehicles.find(v => v.id === escolhido) ?? dash?.active_vehicle ?? vehicles.find(v => v.is_active) ?? vehicles[0];
  const { data: health } = useVehicleHealth(vehicle?.id);
  const lembretes = [...lembretesTodos].sort((a, b) => (ORDEM[a.urgency] ?? 3) - (ORDEM[b.urgency] ?? 3));
  const urgentes = lembretes.filter(r => r.urgency === 'urgente').length;
  const proximoAgendamento = dash?.upcoming_appointments?.[0];
  const ultimo = history[0];

  return (
    <MainLayout width="wide" topbar={
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-[64px] bg-[rgba(243,241,238,0.82)] backdrop-blur-xl lg:hidden">
        <Logo />
        <Avatar />
      </header>
    }>
      <div className="px-4 pt-2 pb-6 lg:pt-6">
        {/* Saudação + ações */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[28px] leading-tight font-normal lg:text-[34px]" style={{ color: V.text }}>
              Olá{primeiroNome ? `, ${primeiroNome}` : ''} <span aria-hidden>👋</span>
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: V.muted }}>Aqui está o resumo do seu carro.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
            <Chip icon={<CalendarPlus size={15} />} onClick={() => navigate('/agendar')} active>Agendar</Chip>
            <Chip icon={<Plus size={15} />} onClick={() => navigate('/veiculos/novo')}>Adicionar veículo</Chip>
            <Chip icon={<FolderOpen size={15} />} onClick={() => navigate('/documentos')}>Documentos</Chip>
            <Chip icon={<QrCode size={15} />} onClick={() => navigate('/qr')}>QR do veículo</Chip>
          </div>
        </div>

        {/* Sem oficina */}
        {oficinas && oficinas.length === 0 && (
          <Glass as="button" onClick={() => navigate('/oficinas')} className="w-full mt-5 p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center flex-none" style={{ background: V.brandSoft }}>
              <Store size={18} color={V.brand} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium" style={{ color: V.text }}>Entre na sua oficina</span>
              <span className="block text-[12px] mt-0.5" style={{ color: V.muted }}>Use o convite dela para agendar e receber orçamentos.</span>
            </span>
            <ChevronRight size={18} color={V.subtle} />
          </Glass>
        )}

        {/* Grade: no celular uma coluna; no desktop, blocos (12 colunas) */}
        <div className="mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:auto-rows-min">
          {isLoading ? (
            <Skeleton className="h-[340px] rounded-[24px] lg:col-span-5 lg:row-span-2" />
          ) : (
            <CardVeiculo vehicles={vehicles} vehicle={vehicle} onChange={setEscolhido} />
          )}

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-2 lg:col-span-7 lg:gap-4">
            {[
              { label: 'Veículos', valor: vehicles.length, extra: null, pct: Math.min(100, vehicles.length * 25), to: '/veiculo' },
              { label: 'Lembretes', valor: lembretes.length, extra: urgentes ? `${urgentes} urgente${urgentes > 1 ? 's' : ''}` : null,
                pct: lembretes.length ? 100 - (urgentes / lembretes.length) * 100 : 100, to: '/manutencoes' },
              { label: 'Orçamentos', valor: orcAguardando.length, extra: orcAguardando.length ? 'aguardando' : null,
                pct: orcAguardando.length ? 60 : 100, to: '/orcamentos' },
            ].map(m => (
              <Glass as="button" key={m.label} onClick={() => navigate(m.to)} className="p-3.5 lg:p-5 flex flex-col gap-2 min-w-0">
                <span className="text-[12px] lg:text-[13px]" style={{ color: V.muted }}>{m.label}</span>
                <span className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[24px] lg:text-[30px] leading-none font-normal tabular" style={{ color: V.text }}>
                    {String(m.valor).padStart(2, '0')}
                  </span>
                  {m.extra && (
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: V.brandSoft, color: V.brand }}>{m.extra}</span>
                  )}
                </span>
                <span className="hidden sm:block"><DotProgress pct={m.pct} color={m.extra ? V.brand : V.ok} /></span>
              </Glass>
            ))}
          </div>

          {/* Saúde (anel) — no celular a saúde já aparece no card do carro */}
          <Glass className="hidden lg:flex lg:col-span-3 p-5 flex-col">
            <CardHeader title="Saúde" subtitle={vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined} />
            <div className="flex-1 flex items-center justify-center py-3">
              {health ? <DotRing value={health.overall_score} label="saúde geral" size={170} /> : <Skeleton className="w-[150px] h-[150px] rounded-full" />}
            </div>
          </Glass>

          <CardLembretes lembretes={lembretes} className="lg:col-span-4" />

          {/* Próxima ação (celular) */}
          {(proximoAgendamento || lembretes[0]) && (
            <Glass className="p-4 flex items-center gap-3 lg:hidden">
              <span className="w-11 h-11 rounded-full nav-raised flex items-center justify-center flex-none" style={{ boxShadow: '0 6px 16px rgba(204,20,0,0.3)' }}>
                {proximoAgendamento ? <Calendar size={18} /> : <Wrench size={18} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider" style={{ color: V.brand }}>
                  {proximoAgendamento ? 'Próximo agendamento' : 'Próxima manutenção'}
                </p>
                <p className="text-[14px] font-medium truncate" style={{ color: V.text }}>
                  {proximoAgendamento ? proximoAgendamento.service_type : lembretes[0]?.service_name}
                </p>
                <p className="text-[12px]" style={{ color: V.muted }}>
                  {proximoAgendamento
                    ? `${format(dia(proximoAgendamento.date), 'dd/MM')} às ${proximoAgendamento.time_slot?.slice(0, 5)}`
                    : lembretes[0]?.km_remaining != null ? `Em ${lembretes[0].km_remaining.toLocaleString('pt-BR')} km` : lembretes[0]?.vehicle_label}
                </p>
              </div>
              {!proximoAgendamento && (
                <button onClick={() => navigate('/agendar')} className="chip-active h-9 px-4 rounded-full text-[12.5px] font-medium">Agendar</button>
              )}
            </Glass>
          )}

          <CardCusto className="lg:col-span-5" />

          {/* Último / próximo serviço */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:col-span-2">
            <Glass className="p-4 flex flex-col gap-1.5">
              <span className="text-[12px]" style={{ color: V.muted }}>Último serviço</span>
              <span className="text-[17px] font-normal" style={{ color: V.text }}>
                {ultimo?.service_date ? format(dia(ultimo.service_date), "dd MMM yyyy", { locale: ptBR }) : '—'}
              </span>
              <span className="text-[11.5px] truncate" style={{ color: V.subtle }}>
                {ultimo ? `${ultimo.service_type} · há ${differenceInCalendarDays(new Date(), dia(ultimo.service_date))} dias` : 'Nenhum ainda'}
              </span>
            </Glass>
            <Glass className="p-4 flex flex-col gap-1.5">
              <span className="text-[12px]" style={{ color: V.muted }}>Próximo serviço</span>
              <span className="text-[17px] font-normal" style={{ color: V.text }}>
                {proximoAgendamento ? format(dia(proximoAgendamento.date), "dd MMM yyyy", { locale: ptBR })
                  : lembretes[0]?.next_service_date ? format(dia(lembretes[0].next_service_date), "dd MMM yyyy", { locale: ptBR })
                  : lembretes[0]?.km_remaining != null
                    ? (lembretes[0].km_remaining < 0 ? 'Atrasado' : `Em ${lembretes[0].km_remaining.toLocaleString('pt-BR')} km`)
                    : '—'}
              </span>
              <span className="text-[11.5px] truncate" style={{ color: V.subtle }}>
                {proximoAgendamento ? proximoAgendamento.service_type : lembretes[0]?.service_name ?? 'Nada agendado'}
              </span>
            </Glass>
          </div>

          {/* Atividade recente */}
          <Glass className="p-5 lg:col-span-5">
            <CardHeader title="Atividade recente" subtitle="Serviços feitos"
              right={<IconCircle label="Ver todos os serviços" onClick={() => navigate('/historico')}><ArrowUpRight size={16} color={V.brand} /></IconCircle>} />
            <div className="mt-4 flex flex-col gap-2">
              {history.length === 0 ? (
                <p className="text-[13px] py-6 text-center" style={{ color: V.subtle }}>Nenhum serviço registrado ainda.</p>
              ) : history.slice(0, 3).map(s => (
                <button key={s.id} onClick={() => navigate(`/servico/${s.id}`)}
                  className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-left" style={{ background: V.tile }}>
                  <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-none">
                    {/óleo|oleo/i.test(s.service_type) ? <Gauge size={16} color={V.muted} />
                      : /freio/i.test(s.service_type) ? <ShieldCheck size={16} color={V.muted} /> : <Activity size={16} color={V.muted} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium truncate" style={{ color: V.text }}>{s.service_type}</span>
                    <span className="block text-[11.5px]" style={{ color: V.subtle }}>
                      {format(dia(s.service_date), 'dd/MM/yyyy')}{s.workshop_name ? ` · ${s.workshop_name}` : ''}
                    </span>
                  </span>
                  {!!s.total_cost && <span className="text-[13.5px] tabular" style={{ color: V.text }}>{brl(s.total_cost)}</span>}
                </button>
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </MainLayout>
  );
}
