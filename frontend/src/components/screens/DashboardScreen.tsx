import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, CalendarPlus, Wrench, Calendar, CheckCircle2, AlertTriangle, FileText, Store, Gauge, ShieldCheck, Activity,
} from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  dashboardApi, oficinasApi, vehiclesApi, historyApi, remindersApi, orcamentosApi,
} from '../../services/api';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { MainLayout, Logo, SinoNotificacoes } from '../layout';
import { Skeleton } from '../ui';
import { useAuthStore } from '../../store/auth';
import { Glass, DotBars, FotoVeiculo, V } from '../visual';
import type { Vehicle } from '../../types';

const dia = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const ORDEM: Record<string, number> = { urgente: 0, atencao: 1, ok: 2 };
const COMB: Record<string, string> = { flex: 'Flex', gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', eletrico: 'Elétrico', hibrido: 'Híbrido', gnv: 'GNV' };

/** Título de card no estilo da referência ("Próxima manutenção", "Status atual"...). */
function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="t-footnote font-semibold mb-2" style={{ color: V.text }}>{children}</p>;
}

function Seta() {
  return <ChevronRight size={18} strokeWidth={2} color="var(--text-3)" className="flex-none" />;
}

/* ─── Card do veículo (foto + placa + km) ─────────────── */
function CardVeiculo({ vehicles, vehicle, onTrocar }: { vehicles: Vehicle[]; vehicle?: Vehicle; onTrocar: () => void }) {
  const navigate = useNavigate();
  if (!vehicle) {
    return (
      <Glass as="button" onClick={() => navigate('/veiculos/novo')} className="w-full p-4 flex items-center gap-3">
        <span className="t-headline flex-1" style={{ color: V.brand }}>+ Cadastrar meu veículo</span>
        <Seta />
      </Glass>
    );
  }
  return (
    <Glass className="p-3 flex items-center gap-3">
      <button onClick={() => navigate(`/veiculo/${vehicle.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-[96px] flex-none"><FotoVeiculo marca={vehicle.brand} modelo={vehicle.model} cor={vehicle.color} className="w-full" /></div>
        <div className="flex-1 min-w-0">
          <p className="t-headline leading-tight" style={{ color: V.text }}>{vehicle.model} <span style={{ color: V.subtle }}>•</span> <span className="whitespace-nowrap">{vehicle.plate}</span></p>
          <p className="t-footnote mt-0.5" style={{ color: V.muted }}>
            {COMB[vehicle.fuel_type] ?? vehicle.fuel_type} • {vehicle.mileage?.toLocaleString('pt-BR')} km
          </p>
        </div>
        <Seta />
      </button>
      {vehicles.length > 1 && (
        <button onClick={onTrocar} className="t-footnote font-semibold px-2 h-11 flex-none" style={{ color: V.brand }}>Trocar</button>
      )}
    </Glass>
  );
}

/* ─── Gastos com manutenção (histórico real, últimos 6 meses) ── */
function CardCusto() {
  const { data: history = [] } = useQuery({ queryKey: ['history'], queryFn: () => historyApi.list().then(r => r.data), staleTime: 60_000 });
  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const m = startOfMonth(subMonths(new Date(), 5 - i));
    const chave = format(m, 'yyyy-MM');
    const value = history.filter(h => h.service_date && format(dia(h.service_date), 'yyyy-MM') === chave)
      .reduce((s, h) => s + (h.total_cost || 0), 0);
    return { label: format(m, 'MMM', { locale: ptBR }).replace('.', ''), value };
  }), [history]);
  const total = meses.reduce((s, m) => s + m.value, 0);
  if (total === 0) return null;
  return (
    <Glass className="p-4">
      <div className="flex items-baseline justify-between">
        <Rotulo>Gastos com manutenção · 6 meses</Rotulo>
        <span className="t-headline tabular" style={{ color: V.text }}>{brl(total)}</span>
      </div>
      <DotBars data={meses} format={brl} height={110} />
    </Glass>
  );
}

/* ─── Início ─────────────────────────────────────────── */
export function DashboardScreen() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const nome = session?.name?.split(' ').slice(0, 2).join(' ') ?? '';
  const [indice, setIndice] = useState(0);

  const { data: dash, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get().then(r => r.data), staleTime: 30_000 });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
  const { data: oficinas } = useQuery({ queryKey: ['oficinas'], queryFn: () => oficinasApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: lembretesTodos = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: orcAguardando = [] } = useQuery({ queryKey: ['orcamentos', 'enviado'], queryFn: () => orcamentosApi.list('enviado').then(r => r.data), staleTime: 30_000 });
  const { data: history = [] } = useQuery({ queryKey: ['history'], queryFn: () => historyApi.list().then(r => r.data), staleTime: 60_000 });

  const ordenados = [...vehicles].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  const vehicle: Vehicle | undefined = ordenados[indice % Math.max(1, ordenados.length)] ?? dash?.active_vehicle ?? undefined;
  const { data: health } = useVehicleHealth(vehicle?.id);
  const lembretes = [...lembretesTodos].filter(r => !vehicle || r.vehicle_id === vehicle.id)
    .sort((a, b) => (ORDEM[a.urgency] ?? 3) - (ORDEM[b.urgency] ?? 3));
  const urgentes = lembretes.filter(r => r.urgency === 'urgente').length;
  const proxima = lembretes[0];
  const agendamento = dash?.upcoming_appointments?.[0];

  const prazo = proxima ? [
    proxima.km_remaining != null
      ? (proxima.km_remaining < 0 ? `Atrasada ${Math.abs(proxima.km_remaining).toLocaleString('pt-BR')} km` : `Em ${proxima.km_remaining.toLocaleString('pt-BR')} km`)
      : null,
    proxima.next_service_date ? `até ${format(dia(proxima.next_service_date), 'dd/MM/yyyy')}` : null,
  ].filter(Boolean).join(' ou ') : '';

  return (
    <MainLayout width="wide" topbar={
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 material lg:hidden"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', boxSizing: 'content-box' }}>
        <Logo />
        <SinoNotificacoes />
      </header>
    }>
      <div className="px-4 pb-6 pt-3 lg:pt-8">
        <h1 className="t-title2" style={{ color: V.text }}>Olá{nome ? `, ${nome}` : ''} <span aria-hidden>👋</span></h1>
        <p className="t-subhead mt-0.5" style={{ color: V.muted }}>Veja o resumo do seu veículo.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          <div className="flex flex-col gap-3 lg:gap-4">
            {isLoading ? <Skeleton className="h-[88px] rounded-2xl" /> : (
              <CardVeiculo vehicles={ordenados} vehicle={vehicle} onTrocar={() => setIndice(i => i + 1)} />
            )}

            {agendamento && (
              <Glass as="button" onClick={() => navigate('/historico')} className="w-full p-4">
                <Rotulo>Próximo agendamento</Rotulo>
                <div className="flex items-center gap-3">
                  <Calendar size={26} strokeWidth={1.6} style={{ color: V.brand }} className="flex-none" />
                  <div className="flex-1 min-w-0">
                    <p className="t-body font-semibold truncate" style={{ color: V.text }}>{agendamento.service_type}</p>
                    <p className="t-footnote" style={{ color: V.muted }}>
                      {format(dia(agendamento.date), 'dd/MM/yyyy')} às {agendamento.time_slot?.slice(0, 5)} ·{' '}
                      {agendamento.status === 'confirmado' ? 'confirmado' : 'aguardando a oficina'}
                    </p>
                  </div>
                  <Seta />
                </div>
              </Glass>
            )}

            {proxima && (
              <Glass as="button" onClick={() => navigate('/manutencoes')} className="w-full p-4">
                <Rotulo>Próxima manutenção</Rotulo>
                <div className="flex items-center gap-3">
                  <Wrench size={26} strokeWidth={1.6} style={{ color: proxima.urgency === 'urgente' ? V.red : V.text }} className="flex-none" />
                  <div className="flex-1 min-w-0">
                    <p className="t-body font-semibold truncate" style={{ color: V.text }}>{proxima.service_name}</p>
                    <p className="t-footnote" style={{ color: proxima.urgency === 'urgente' ? V.red : V.muted }}>{prazo}</p>
                  </div>
                  <Seta />
                </div>
              </Glass>
            )}

            <Glass as="button" onClick={() => vehicle && navigate(`/saude?veiculo=${vehicle.id}`)} className="w-full p-4">
              <Rotulo>Status atual</Rotulo>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {urgentes > 0 ? (
                    <p className="t-body font-semibold flex items-center gap-1.5" style={{ color: V.red }}>
                      <AlertTriangle size={17} /> {urgentes === 1 ? '1 manutenção atrasada' : `${urgentes} manutenções atrasadas`}
                    </p>
                  ) : (
                    <p className="t-body font-semibold flex items-center gap-1.5" style={{ color: V.text }}>
                      Tudo em dia! <CheckCircle2 size={17} style={{ color: V.ok }} />
                    </p>
                  )}
                  <p className="t-footnote mt-0.5" style={{ color: V.muted }}>
                    {urgentes > 0 ? 'Agende o serviço para manter o veículo seguro.' : 'Seu veículo está com todas as manutenções em dia.'}
                    {health ? ` Saúde geral: ${health.overall_score}%.` : ''}
                  </p>
                </div>
                <Seta />
              </div>
            </Glass>

            {orcAguardando.length > 0 && (
              <Glass as="button" onClick={() => navigate('/orcamentos')} className="w-full p-4 flex items-center gap-3">
                <FileText size={22} strokeWidth={1.7} style={{ color: V.warn }} className="flex-none" />
                <span className="flex-1 t-body" style={{ color: V.text }}>
                  {orcAguardando.length === 1 ? '1 orçamento aguardando você' : `${orcAguardando.length} orçamentos aguardando você`}
                </span>
                <Seta />
              </Glass>
            )}

            {oficinas && oficinas.length === 0 && (
              <Glass as="button" onClick={() => navigate('/oficinas')} className="w-full p-4 flex items-center gap-3">
                <Store size={22} strokeWidth={1.7} style={{ color: V.brand }} className="flex-none" />
                <span className="flex-1 min-w-0">
                  <span className="block t-body font-semibold" style={{ color: V.text }}>Entre na sua oficina</span>
                  <span className="block t-footnote" style={{ color: V.muted }}>Use o convite dela para agendar e receber orçamentos.</span>
                </span>
                <Seta />
              </Glass>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:gap-4">
            <Glass className="p-4">
              <Rotulo>Últimos serviços</Rotulo>
              {history.length === 0 ? (
                <p className="t-footnote py-3" style={{ color: V.subtle }}>Nenhum serviço registrado ainda.</p>
              ) : history.slice(0, 3).map((s, i) => (
                <button key={s.id} onClick={() => navigate(`/servico/${s.id}`)}
                  className="w-full flex items-center gap-3 py-2.5 text-left press-row rounded-lg"
                  style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span className="flex-none" style={{ color: V.muted }}>
                    {/óleo|oleo/i.test(s.service_type) ? <Gauge size={22} strokeWidth={1.6} />
                      : /freio/i.test(s.service_type) ? <ShieldCheck size={22} strokeWidth={1.6} /> : <Activity size={22} strokeWidth={1.6} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block t-subhead font-semibold truncate" style={{ color: V.text }}>{s.service_type}</span>
                    <span className="block t-footnote" style={{ color: V.muted }}>
                      {format(dia(s.service_date), 'dd/MM/yyyy')} • {s.mileage_at_service?.toLocaleString('pt-BR')} km
                    </span>
                  </span>
                  <Seta />
                </button>
              ))}
            </Glass>

            <CardCusto />

            <button onClick={() => navigate('/agendar')}
              className="w-full h-12 rounded-[10px] t-headline text-white flex items-center justify-center gap-2 active:brightness-90"
              style={{ background: 'var(--tint-fill)' }}>
              <CalendarPlus size={19} /> Agendar manutenção
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
