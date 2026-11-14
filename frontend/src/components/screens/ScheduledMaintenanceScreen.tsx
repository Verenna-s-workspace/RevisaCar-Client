import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, AlertTriangle, Clock, CheckCircle2, Wrench } from 'lucide-react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { remindersApi, vehiclesApi, appointmentsApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { IconCircle } from '../visual';
import { Skeleton } from '../ui';
import { Glass, PriorityBadge, DotProgress, CardHeader, CarIllustration, Segmented, V } from '../visual';
import type { MaintenanceReminder, Urgency } from '../../types';

const dia = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const ORDEM: Record<string, number> = { urgente: 0, atencao: 1, ok: 2 };

const FILTROS: { v: 'all' | Urgency; t: string }[] = [
  { v: 'all', t: 'Todas' }, { v: 'urgente', t: 'Urgentes' }, { v: 'atencao', t: 'Atenção' }, { v: 'ok', t: 'Em dia' },
];

function prazo(r: MaintenanceReminder) {
  if (r.km_remaining != null) {
    return r.km_remaining < 0
      ? { valor: 'Atrasado', extra: `passou ${Math.abs(r.km_remaining).toLocaleString('pt-BR')} km`, alerta: true }
      : { valor: `${r.km_remaining.toLocaleString('pt-BR')} km`, extra: 'restantes', alerta: r.urgency === 'urgente' };
  }
  if (r.next_service_date) return { valor: format(dia(r.next_service_date), 'dd MMM yyyy', { locale: ptBR }), extra: '', alerta: r.urgency === 'urgente' };
  return { valor: '—', extra: '', alerta: false };
}

/* Card de lembrete (estilo "cartão" da referência). */
function CardLembrete({ r, cor }: { r: MaintenanceReminder; cor?: string }) {
  const navigate = useNavigate();
  const p = prazo(r);
  return (
    <Glass className="p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PriorityBadge urgency={r.urgency} />
          <p className="text-[1.25rem] font-normal mt-3 truncate" style={{ color: V.text }}>{r.vehicle_label?.split('·')[0]?.trim() || 'Seu veículo'}</p>
        </div>
        <CarIllustration color={cor} className="w-[150px] lg:w-[190px] flex-none -mr-1 -mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="min-w-0">
          <p className="text-[0.75rem]" style={{ color: V.subtle }}>Serviço</p>
          <p className="text-[0.8125rem] mt-1 truncate" style={{ color: V.text }}>{r.service_name}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[0.75rem]" style={{ color: V.subtle }}>
            Prazo {p.extra && <span style={{ color: p.alerta ? V.brand : V.subtle }}>({p.extra})</span>}
          </p>
          <p className="text-[0.8125rem] mt-1 truncate" style={{ color: p.alerta ? V.brand : V.text }}>{p.valor}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[0.75rem]" style={{ color: V.subtle }}>Intervalo</p>
          <div className="mt-2"><DotProgress pct={r.progress_pct} dots={14}
            color={r.urgency === 'urgente' ? V.brand : r.urgency === 'atencao' ? V.warn : V.ok} /></div>
          <p className="text-[0.75rem] mt-1" style={{ color: V.muted }}>{Math.round(r.progress_pct)}% usado</p>
        </div>
      </div>
      {r.urgency !== 'ok' && (
        <button onClick={() => navigate('/agendar')} className="chip-active mt-4 h-9 px-4 rounded-full text-[0.75rem] font-medium inline-flex items-center gap-1.5">
          <CalendarPlus size={14} /> Agendar
        </button>
      )}
    </Glass>
  );
}

export function ScheduledMaintenanceScreen() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'all' | Urgency>('all');

  const { data: reminders = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.list().then(r => r.data) });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
  const { data: agendamentos = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => appointmentsApi.list().then(r => r.data), staleTime: 60_000 });

  const corDo = (vehicleId: string) => vehicles.find(v => v.id === vehicleId)?.color;
  const ordenados = [...reminders].sort((a, b) => (ORDEM[a.urgency] ?? 3) - (ORDEM[b.urgency] ?? 3));
  const lista = filtro === 'all' ? ordenados : ordenados.filter(r => r.urgency === filtro);
  const contar = (u: Urgency) => reminders.filter(r => r.urgency === u).length;

  // Semana atual: agendamentos e lembretes com data caem no dia certo.
  const semana = useMemo(() => {
    const ini = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ini, i);
      const itens = [
        ...agendamentos.filter(a => a.status !== 'cancelado' && a.date && isSameDay(dia(a.date), d))
          .map(a => ({ t: a.service_type, h: a.time_slot?.slice(0, 5), tipo: 'agendamento' as const })),
        ...reminders.filter(r => r.next_service_date && isSameDay(dia(r.next_service_date), d))
          .map(r => ({ t: r.service_name, h: '', tipo: 'lembrete' as const })),
      ];
      return { d, itens };
    });
  }, [agendamentos, reminders]);

  return (
    <MainLayout width="wide" topbar={<Topbar title="Manutenção" subtitle="Prazos dos serviços e agendamento" right={<IconCircle label="Agendar serviço" onClick={() => navigate('/agendar')}><CalendarPlus size={22} /></IconCircle>} />}>
      <div className="px-4 pb-8">

        <div className="py-3">
          <Segmented label="Filtrar por prioridade" value={filtro} onChange={setFiltro}
            options={FILTROS.map(f => ({ value: f.v, label: f.t }))} />
        </div>

        {/* Números */}
        <div className="grid grid-cols-3 gap-2 lg:gap-4">
          {[
            { icon: AlertTriangle, n: contar('urgente'), t: 'Urgentes', c: V.brand },
            { icon: Clock, n: contar('atencao'), t: 'Perto do prazo', c: V.warn },
            { icon: CheckCircle2, n: contar('ok'), t: 'Em dia', c: V.ok },
          ].map(m => (
            <Glass key={m.t} className="p-3.5 lg:p-5 flex flex-col gap-2">
              <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center"><m.icon size={14} color={m.c} /></span>
              <span className="text-[1.375rem] lg:text-[1.75rem] leading-none font-normal tabular" style={{ color: V.text }}>{m.n}</span>
              <span className="text-[0.75rem]" style={{ color: V.muted }}>{m.t}</span>
            </Glass>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Pilha de lembretes: o mais urgente na frente */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {isLoading ? (
              [0, 1].map(i => <Skeleton key={i} className="h-[190px] rounded-2xl" />)
            ) : lista.length === 0 ? (
              <Glass className="p-8 flex flex-col items-center text-center gap-2">
                <Wrench size={30} color={V.subtle} />
                <p className="text-[0.9375rem] font-medium" style={{ color: V.text }}>Nenhum lembrete aqui</p>
                <p className="text-[0.8125rem]" style={{ color: V.muted }}>Os lembretes de manutenção aparecem conforme os serviços feitos na oficina.</p>
              </Glass>
            ) : (
              <>
                <div className="relative">
                  {lista.length > 1 && (
                    <>
                      <div aria-hidden className="glass absolute inset-x-6 -top-3 h-10 rounded-2xl opacity-60" />
                      <div aria-hidden className="glass absolute inset-x-3 -top-1.5 h-10 rounded-2xl opacity-80" />
                    </>
                  )}
                  <div className="relative"><CardLembrete r={lista[0]} cor={corDo(lista[0].vehicle_id)} /></div>
                </div>
                {lista.slice(1).map(r => <CardLembrete key={r.id} r={r} cor={corDo(r.vehicle_id)} />)}
              </>
            )}
          </div>

          {/* Calendário da semana */}
          <Glass className="p-5 lg:col-span-5 self-start">
            <CardHeader title="Calendário de manutenção" subtitle="Esta semana" />
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {semana.map(({ d, itens }) => {
                const hoje = isSameDay(d, new Date());
                return (
                  <div key={d.toISOString()} className="rounded-[14px] py-2.5 flex flex-col items-center gap-1"
                       style={{ background: hoje ? V.brand : V.tile, color: hoje ? '#fff' : V.text }}>
                    <span className="text-[0.6875rem] capitalize" style={{ opacity: 0.75 }}>{format(d, 'EEEEEE', { locale: ptBR })}</span>
                    <span className="text-[0.9375rem] tabular">{format(d, 'd')}</span>
                    <span className="h-1.5 flex gap-0.5">
                      {itens.slice(0, 3).map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: hoje ? '#fff' : V.brand }} />)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {semana.every(s => s.itens.length === 0) ? (
                <p className="text-[0.8125rem] text-center py-3" style={{ color: V.subtle }}>Nada marcado para esta semana.</p>
              ) : semana.flatMap(s => s.itens.map((it, i) => (
                <div key={`${s.d.toISOString()}-${i}`} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5" style={{ background: V.tile }}>
                  <span className="text-[0.75rem] w-12 capitalize" style={{ color: V.muted }}>{format(s.d, 'EEE d', { locale: ptBR })}</span>
                  <span className="flex-1 text-[0.8125rem] truncate" style={{ color: V.text }}>{it.t}</span>
                  <span className="text-[0.75rem]" style={{ color: it.tipo === 'agendamento' ? V.brand : V.muted }}>
                    {it.tipo === 'agendamento' ? (it.h || 'agendado') : 'prazo'}
                  </span>
                </div>
              )))}
            </div>
          </Glass>
        </div>
      </div>
    </MainLayout>
  );
}
