import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ChevronDown, Plus, FolderOpen, QrCode, Store, Wrench, FileText,
  Calendar, ChevronRight, Gauge, ShieldCheck, Activity,
} from 'lucide-react';
import { format, subMonths, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  dashboardApi, oficinasApi, vehiclesApi, historyApi, remindersApi, orcamentosApi,
} from '../../services/api';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { MainLayout, Topbar, Avatar, SinoNotificacoes } from '../layout';
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
        className="chip h-9 pl-4 pr-3 rounded-full flex items-center gap-2 text-[0.8125rem] font-medium">
        {atual.brand} {atual.model}
        {vehicles.length > 1 && <ChevronDown size={15} color={V.brand} />}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setAberto(false)} />
          <div className="glass absolute left-0 top-11 z-30 min-w-[200px] rounded-2xl p-1.5">
            {vehicles.map(v => (
              <button key={v.id} onClick={() => { onChange(v.id); setAberto(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-fill">
                <p className="text-[0.8125rem] font-medium" style={{ color: V.text }}>{v.brand} {v.model}</p>
                <p className="text-[0.75rem]" style={{ color: V.subtle }}>{v.plate}</p>
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
      <Glass className="p-6 flex flex-col items-center text-center gap-3 lg:col-span-7">
        <CarIllustration className="w-full max-w-[320px] opacity-60" />
        <p className="text-[0.9375rem] font-medium" style={{ color: V.text }}>Cadastre seu primeiro veículo</p>
        <button onClick={() => navigate('/veiculos/novo')} className="chip-active h-10 px-5 rounded-full text-[0.8125rem] font-medium">
          Adicionar veículo
        </button>
      </Glass>
    );
  }
  // Saúde geral + as duas áreas que mais precisam de atenção (dados reais do backend).
  const areas = [...(health?.categories ?? [])].sort((a, b) => a.score - b.score).slice(0, 2);
  return (
    <Glass className="p-4 lg:p-5 flex flex-col lg:col-span-7">
      <div className="flex items-center justify-between">
        <SeletorVeiculo vehicles={vehicles} atual={vehicle} onChange={onChange} />
        <IconCircle label="Ver detalhes do veículo" onClick={() => navigate(`/veiculo/${vehicle.id}`)}>
          <ArrowUpRight size={17} color={V.brand} />
        </IconCircle>
      </div>
      <p className="text-[0.75rem] mt-2 px-1" style={{ color: V.subtle }}>
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
        right={<span className="text-[0.9375rem] font-medium tabular" style={{ color: V.text }}>{brl(total)}</span>} />
      <div className="mt-5">
        {total === 0
          ? <p className="text-[0.8125rem] py-10 text-center" style={{ color: V.subtle }}>Nenhum serviço pago nos últimos 6 meses.</p>
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
          <p className="text-[0.8125rem] py-6 text-center" style={{ color: V.subtle }}>Tudo em dia por aqui.</p>
        ) : lembretes.slice(0, 4).map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: V.tile }}>
            <span className="w-2 h-2 rounded-full flex-none"
                  style={{ background: r.urgency === 'urgente' ? V.brand : r.urgency === 'atencao' ? V.warn : V.ok }} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.8125rem] font-medium truncate" style={{ color: V.text }}>{r.service_name}</p>
              <p className="text-[0.75rem] truncate" style={{ color: V.subtle }}>
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

  // A coisa mais importante agora: agendamento marcado ou manutenção mais urgente.
  const acao = proximoAgendamento
    ? { tipo: 'agendamento' as const, titulo: proximoAgendamento.service_type,
        detalhe: `${format(dia(proximoAgendamento.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${proximoAgendamento.time_slot?.slice(0, 5)}`,
        status: proximoAgendamento.status === 'confirmado' ? 'Confirmado pela oficina' : 'Aguardando a oficina confirmar' }
    : lembretes[0] && lembretes[0].urgency !== 'ok'
      ? { tipo: 'manutencao' as const, titulo: lembretes[0].service_name,
          detalhe: lembretes[0].km_remaining != null
            ? (lembretes[0].km_remaining < 0 ? `Atrasada ${Math.abs(lembretes[0].km_remaining).toLocaleString('pt-BR')} km` : `Faltam ${lembretes[0].km_remaining.toLocaleString('pt-BR')} km`)
            : lembretes[0].next_service_date ? `Até ${format(dia(lembretes[0].next_service_date), 'dd/MM')}` : '',
          status: urgentes > 1 ? `E mais ${urgentes - 1} manutenção urgente` : '' }
      : null;

  return (
    <MainLayout width="wide" topbar={
      <Topbar title="Meu carro" subtitle={primeiroNome ? `Olá, ${primeiroNome}` : undefined}
        right={<><SinoNotificacoes /><span className="lg:hidden pr-1"><Avatar /></span></>} />
    }>
      <div className="px-4 pb-6 flex flex-col gap-4">
        {/* 1. O que fazer agora */}
        {acao && (
          <Glass className="p-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-none text-white"
                    style={{ background: acao.tipo === 'agendamento' ? 'var(--tint-fill)' : 'var(--red)' }}>
                {acao.tipo === 'agendamento' ? <Calendar size={20} /> : <Wrench size={20} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="t-footnote font-semibold" style={{ color: acao.tipo === 'agendamento' ? V.brand : V.red }}>
                  {acao.tipo === 'agendamento' ? 'Próximo agendamento' : 'Manutenção urgente'}
                </p>
                <p className="t-headline truncate" style={{ color: V.text }}>{acao.titulo}</p>
                <p className="t-subhead capitalize-first" style={{ color: V.muted }}>{acao.detalhe}</p>
                {acao.status && <p className="t-footnote mt-0.5" style={{ color: V.subtle }}>{acao.status}</p>}
              </div>
            </div>
            {acao.tipo === 'manutencao' && (
              <button onClick={() => navigate('/agendar')} className="mt-3 w-full h-11 rounded-[12px] t-headline text-white active:brightness-90"
                      style={{ background: 'var(--tint-fill)' }}>
                Agendar agora
              </button>
            )}
          </Glass>
        )}

        {/* Orçamento esperando resposta */}
        {orcAguardando.length > 0 && (
          <Glass as="button" onClick={() => navigate('/orcamentos')} className="w-full px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-none text-white" style={{ background: 'var(--orange)' }}>
              <FileText size={17} />
            </span>
            <span className="flex-1 t-body" style={{ color: V.text }}>
              {orcAguardando.length === 1 ? '1 orçamento aguardando você' : `${orcAguardando.length} orçamentos aguardando você`}
            </span>
            <ChevronRight size={17} strokeWidth={2.4} color="var(--text-3)" style={{ opacity: 0.6 }} />
          </Glass>
        )}

        {/* Sem oficina */}
        {oficinas && oficinas.length === 0 && (
          <Glass as="button" onClick={() => navigate('/oficinas')} className="w-full p-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-none text-white" style={{ background: 'var(--tint-fill)' }}>
              <Store size={17} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block t-headline" style={{ color: V.text }}>Entre na sua oficina</span>
              <span className="block t-footnote mt-0.5" style={{ color: V.muted }}>Use o convite dela para agendar e receber orçamentos.</span>
            </span>
            <ChevronRight size={17} strokeWidth={2.4} color="var(--text-3)" style={{ opacity: 0.6 }} />
          </Glass>
        )}

        {/* Ações secundárias */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          <Chip icon={<Plus size={15} />} onClick={() => navigate('/veiculos/novo')}>Adicionar veículo</Chip>
          <Chip icon={<FolderOpen size={15} />} onClick={() => navigate('/documentos')}>Documentos</Chip>
          <Chip icon={<QrCode size={15} />} onClick={() => navigate('/qr')}>QR do veículo</Chip>
        </div>

        {/* 2. O carro e o resto (no computador, em blocos) */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:auto-rows-min">
          {isLoading ? (
            <Skeleton className="h-[340px] rounded-2xl lg:col-span-7" />
          ) : (
            <CardVeiculo vehicles={vehicles} vehicle={vehicle} onChange={setEscolhido} />
          )}

          {/* Saúde (anel) — no celular a saúde já aparece no card do carro */}
          <Glass className="hidden lg:flex lg:col-span-5 p-5 flex-col">
            <CardHeader title="Saúde" subtitle={vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined} />
            <div className="flex-1 flex items-center justify-center py-3">
              {health ? <DotRing value={health.overall_score} label="saúde geral" size={160} /> : <Skeleton className="w-[150px] h-[150px] rounded-full" />}
            </div>
          </Glass>

          <CardLembretes lembretes={lembretes} className="lg:col-span-5" />

          <CardCusto className="lg:col-span-7" />

          {/* Último / próximo serviço */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-5 lg:content-start">
            <Glass className="p-4 flex flex-col gap-1.5">
              <span className="text-[0.75rem]" style={{ color: V.muted }}>Último serviço</span>
              <span className="text-[1.0625rem] font-normal" style={{ color: V.text }}>
                {ultimo?.service_date ? format(dia(ultimo.service_date), "dd MMM yyyy", { locale: ptBR }) : '—'}
              </span>
              <span className="text-[0.75rem] truncate" style={{ color: V.subtle }}>
                {ultimo ? `${ultimo.service_type} · há ${differenceInCalendarDays(new Date(), dia(ultimo.service_date))} dias` : 'Nenhum ainda'}
              </span>
            </Glass>
            <Glass className="p-4 flex flex-col gap-1.5">
              <span className="text-[0.75rem]" style={{ color: V.muted }}>Próximo serviço</span>
              <span className="text-[1.0625rem] font-normal" style={{ color: V.text }}>
                {proximoAgendamento ? format(dia(proximoAgendamento.date), "dd MMM yyyy", { locale: ptBR })
                  : lembretes[0]?.next_service_date ? format(dia(lembretes[0].next_service_date), "dd MMM yyyy", { locale: ptBR })
                  : lembretes[0]?.km_remaining != null
                    ? (lembretes[0].km_remaining < 0 ? 'Atrasado' : `Em ${lembretes[0].km_remaining.toLocaleString('pt-BR')} km`)
                    : '—'}
              </span>
              <span className="text-[0.75rem] truncate" style={{ color: V.subtle }}>
                {proximoAgendamento ? proximoAgendamento.service_type : lembretes[0]?.service_name ?? 'Nada agendado'}
              </span>
            </Glass>
          </div>

          {/* Atividade recente */}
          <Glass className="p-5 lg:col-span-12">
            <CardHeader title="Atividade recente" subtitle="Serviços feitos"
              right={<IconCircle label="Ver todos os serviços" onClick={() => navigate('/historico')}><ArrowUpRight size={16} color={V.brand} /></IconCircle>} />
            <div className="mt-4 flex flex-col gap-2">
              {history.length === 0 ? (
                <p className="text-[0.8125rem] py-6 text-center" style={{ color: V.subtle }}>Nenhum serviço registrado ainda.</p>
              ) : history.slice(0, 3).map(s => (
                <button key={s.id} onClick={() => navigate(`/servico/${s.id}`)}
                  className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-left" style={{ background: V.tile }}>
                  <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-none">
                    {/óleo|oleo/i.test(s.service_type) ? <Gauge size={16} color={V.muted} />
                      : /freio/i.test(s.service_type) ? <ShieldCheck size={16} color={V.muted} /> : <Activity size={16} color={V.muted} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.8125rem] font-medium truncate" style={{ color: V.text }}>{s.service_type}</span>
                    <span className="block text-[0.75rem]" style={{ color: V.subtle }}>
                      {format(dia(s.service_date), 'dd/MM/yyyy')}{s.workshop_name ? ` · ${s.workshop_name}` : ''}
                    </span>
                  </span>
                  {!!s.total_cost && <span className="text-[0.8125rem] tabular" style={{ color: V.text }}>{brl(s.total_cost)}</span>}
                </button>
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </MainLayout>
  );
}
