import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Wrench, Droplet, Disc3, CircleDot, Filter, BatteryCharging, ClipboardCheck } from 'lucide-react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { remindersApi, vehiclesApi, appointmentsApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { IconCircle } from '../visual';
import { Skeleton } from '../ui';
import { Glass, PriorityBadge, DotProgress, CardHeader, Segmented, V } from '../visual';
import type { MaintenanceReminder, Urgency, Vehicle } from '../../types';

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

const ICONES: [RegExp, typeof Wrench][] = [
  [/óleo|oleo/i, Droplet], [/freio|pastilha/i, Disc3], [/alinhamento|balanceamento|pneu/i, CircleDot],
  [/filtro/i, Filter], [/bateria/i, BatteryCharging], [/revis/i, ClipboardCheck],
];
const iconeDo = (nome: string) => ICONES.find(([re]) => re.test(nome))?.[1] ?? Wrench;

/** Linha de lembrete (estilo da referência): ícone, serviço, prazo e selo. */
function LinhaLembrete({ r, veiculo, primeira }: { r: MaintenanceReminder; veiculo?: Vehicle; primeira: boolean }) {
  const navigate = useNavigate();
  const p = prazo(r);
  const Icone = iconeDo(r.service_name);
  const quando = [
    r.km_remaining != null ? (r.km_remaining < 0 ? `Atrasada ${Math.abs(r.km_remaining).toLocaleString('pt-BR')} km` : `Em ${r.km_remaining.toLocaleString('pt-BR')} km`) : null,
    r.next_service_date ? `até ${format(dia(r.next_service_date), 'dd/MM/yyyy')}` : null,
  ].filter(Boolean).join(' ou ') || p.valor;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5" style={{ borderTop: primeira ? 'none' : '1px solid var(--line)' }}>
      <Icone size={24} strokeWidth={1.6} className="flex-none mt-0.5" style={{ color: r.urgency === 'urgente' ? V.red : r.urgency === 'atencao' ? V.warn : V.text }} />
      <div className="flex-1 min-w-0">
        <p className="t-subhead font-semibold" style={{ color: V.text }}>{r.service_name}</p>
        <p className="t-footnote mt-0.5" style={{ color: r.urgency === 'urgente' ? V.red : V.muted }}>{quando}</p>
        {veiculo && <p className="t-caption mt-0.5" style={{ color: V.subtle }}>{veiculo.brand} {veiculo.model} · {veiculo.plate}</p>}
        <div className="mt-2 flex items-center gap-2">
          <PriorityBadge urgency={r.urgency} />
          {r.urgency !== 'ok' && (
            <button onClick={() => navigate('/agendar')} className="t-footnote font-semibold" style={{ color: V.brand }}>Agendar</button>
          )}
        </div>
      </div>
      <div className="w-16 pt-2 flex-none"><DotProgress pct={r.progress_pct} color={r.urgency === 'urgente' ? V.red : r.urgency === 'atencao' ? V.warn : V.ok} /></div>
    </div>
  );
}

export function ScheduledMaintenanceScreen() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'all' | Urgency>('all');

  const { data: reminders = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.list().then(r => r.data) });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
  const { data: agendamentos = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => appointmentsApi.list().then(r => r.data), staleTime: 60_000 });

  const veiculoDo = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);
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
    <MainLayout width="wide" topbar={<Topbar title="Manutenções programadas" showBack right={<IconCircle label="Agendar serviço" onClick={() => navigate('/agendar')}><CalendarPlus size={22} /></IconCircle>} />}>
      <div className="px-4 pb-8">

        <div className="py-3">
          <Segmented label="Filtrar por prioridade" value={filtro} onChange={setFiltro}
            options={FILTROS.map(f => ({ value: f.v, label: f.t }))} />
        </div>

        <div className="mt-1 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 flex flex-col gap-3">
            {isLoading ? (
              <Skeleton className="h-[220px] rounded-2xl" />
            ) : lista.length === 0 ? (
              <Glass className="p-8 flex flex-col items-center text-center gap-2">
                <Wrench size={30} color={V.subtle} />
                <p className="t-headline" style={{ color: V.text }}>Nenhum lembrete aqui</p>
                <p className="t-footnote" style={{ color: V.muted }}>Os lembretes aparecem conforme os serviços feitos na oficina.</p>
              </Glass>
            ) : (
              <Glass className="overflow-hidden">
                {lista.map((r, i) => <LinhaLembrete key={r.id} r={r} veiculo={veiculoDo(r.vehicle_id)} primeira={i === 0} />)}
              </Glass>
            )}
            <p className="t-footnote px-1" style={{ color: V.subtle }}>
              {contar('urgente')} atrasada(s) · {contar('atencao')} perto do prazo · {contar('ok')} em dia
            </p>
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
