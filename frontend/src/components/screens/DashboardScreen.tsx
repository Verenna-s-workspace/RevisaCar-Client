import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarPlus, Clock, FileText, ChevronRight,
  AlertTriangle, CheckCircle, Info, TrendingUp, Car,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dashboardApi } from '../../services/api';

const BYPASS = import.meta.env.VITE_BYPASS_LOGIN === 'true';
const mockDashboard = {
  active_vehicle: { id: 'v1', brand: 'Fiat', model: 'Uno', plate: 'ABC-1234', year: 2018, color: 'Prata', mileage: 45230 },
  upcoming_appointments: [],
  pending_estimates_count: 0,
  urgent_reminders: [
    { id: 'r1', service_name: 'Troca de óleo', km_remaining: 1200, progress_pct: 40, urgency: 'atencao', next_service_date: null },
  ],
  recent_notifications: [
    { id: 'n1', title: 'Bem-vindo ao app (dev)', type: 'sistema', created_at: new Date().toISOString(), is_read: false },
  ],
  unread_notifications_count: 1,
};
import { useAuthStore } from '../../store/auth';
import { UrgencyBadge, Skeleton, SkeletonList, ProgressBar } from '../ui';
import { MainLayout, Topbar } from '../layout';
import type { MaintenanceReminder, Notification } from '../../types';
import { clsx } from 'clsx';

/* ─── Stagger container ─────────────────────────────────── */
const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Vehicle Hero ──────────────────────────────────────── */
function VehicleHero({ vehicle, onAdd }: { vehicle: any; onAdd: () => void }) {
  const navigate = useNavigate();

  if (!vehicle) {
    return (
      <motion.div variants={fadeUp}
        className="relative bg-gradient-to-br from-brand via-brand-dark to-brand-deep rounded-2xl p-5 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
        <p className="text-white/80 text-sm mb-4 relative z-10">Nenhum veículo cadastrado ainda.</p>
        <button
          onClick={onAdd}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm
                     border border-white/25 rounded-xl text-white text-sm font-semibold
                     hover:bg-white/25 transition-all active:scale-95"
        >
          <Car size={15} /> Adicionar veículo
        </button>
      </motion.div>
    );
  }

  const stats = [
    { val: `${vehicle.mileage?.toLocaleString('pt-BR') || '—'} km`, lbl: 'Quilometragem' },
    { val: '10.000 km',   lbl: 'Próx. revisão' },
    { val: 'Normal',      lbl: 'Status geral',  highlight: true },
  ];

  return (
    <motion.div variants={fadeUp}
      className="relative bg-gradient-to-br from-brand via-brand-dark to-brand-deep rounded-2xl p-5 overflow-hidden cursor-pointer"
      onClick={() => navigate('/veiculos')}
    >
      {/* Decorative circles */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute right-12 -top-4 w-20 h-20 rounded-full bg-white/[0.04]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.07)_0%,_transparent_60%)]" />

      {/* Active chip */}
      <div className="relative z-10 inline-flex items-center gap-1.5 bg-white/14 backdrop-blur-sm
                      border border-white/18 rounded-full px-3 py-1 mb-3.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
        <span className="text-2xs font-bold text-white/90 tracking-wide uppercase">Veículo ativo</span>
      </div>

      <div className="relative z-10">
        <div className="text-xl font-bold text-white leading-tight mb-0.5">
          {vehicle.brand} {vehicle.model}
        </div>
        <div className="text-sm text-white/75 font-medium tracking-wide mb-5">
          {vehicle.plate} · {vehicle.year} · {vehicle.color || 'Sem cor'}
        </div>

        <div className="grid grid-cols-3 border-t border-white/12 pt-4 gap-0">
          {stats.map(({ val, lbl, highlight }, i) => (
            <div key={lbl} className={clsx(
              i < 2 && 'border-r border-white/12 pr-3',
              i > 0 && 'pl-3',
            )}>
              <div className={clsx('text-base font-bold leading-tight tabular',
                highlight ? 'text-emerald-300' : 'text-white'
              )}>
                {val}
              </div>
              <div className="text-2xs text-white/60 mt-1 uppercase tracking-wider leading-tight">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Metric Grid ───────────────────────────────────────── */
function MetricGrid({ data }: { data: any }) {
  const navigate = useNavigate();
  const items = [
    {
      val: data?.upcoming_appointments?.length ?? 0,
      lbl: 'Agendamentos',
      sub: 'ativos',
      icon: CalendarPlus,
      iconBg: 'bg-info-bg',
      iconColor: 'text-info',
      to: '/agendar',
    },
    {
      val: data?.pending_estimates_count ?? 0,
      lbl: 'Orçamentos',
      sub: 'pendentes',
      icon: FileText,
      iconBg: 'bg-warn-bg',
      iconColor: 'text-warn',
      to: '/orcamentos',
    },
    {
      val: 12,
      lbl: 'Serviços',
      sub: 'realizados',
      icon: CheckCircle,
      iconBg: 'bg-ok-bg',
      iconColor: 'text-ok',
      to: '/historico',
    },
    {
      val: data?.urgent_reminders?.length ?? 0,
      lbl: 'Lembretes',
      sub: 'ativos',
      icon: AlertTriangle,
      iconBg: 'bg-crit-bg',
      iconColor: 'text-crit',
      to: '/manutencoes',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ val, lbl, sub, icon: Icon, iconBg, iconColor, to }, i) => (
        <motion.button
          key={lbl}
          variants={fadeUp}
          custom={i}
          onClick={() => navigate(to)}
          className="bg-white rounded-2xl border border-border p-4 flex flex-col gap-3 text-left
                     hover:border-border-md hover:shadow-sm active:scale-[0.97] transition-all duration-150 shadow-xs"
        >
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', iconBg, iconColor)}>
            <Icon size={17} />
          </div>
          <div>
            <div className="text-3xl font-bold text-text tabular leading-none">{val}</div>
            <div className="text-xs text-text-muted mt-1 font-medium">
              {lbl} <span className="text-text-subtle">{sub}</span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

/* ─── Quick Actions ─────────────────────────────────────── */
function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: 'Agendar',      icon: CalendarPlus, to: '/agendar',    color: 'text-brand bg-crit-bg' },
    { label: 'Histórico',    icon: Clock,        to: '/historico',  color: 'text-info bg-info-bg'  },
    { label: 'Orçamentos',   icon: FileText,     to: '/orcamentos', color: 'text-warn bg-warn-bg'  },
    { label: 'Manutenções',  icon: TrendingUp,   to: '/manutencoes',color: 'text-ok bg-ok-bg'      },
  ];
  return (
    <motion.div variants={fadeUp}>
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3 px-0.5">Acesso rápido</p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ label, icon: Icon, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-border
                       hover:border-border-md hover:shadow-sm active:scale-95 transition-all duration-150 shadow-xs"
          >
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
              <Icon size={18} />
            </div>
            <span className="text-2xs font-semibold text-text-muted text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Upcoming Maintenance ──────────────────────────────── */
function UpcomingSection({ reminders }: { reminders: MaintenanceReminder[] }) {
  const navigate = useNavigate();
  if (!reminders.length) return null;

  const dotColor: Record<string, string> = {
    urgente: 'bg-brand', atencao: 'bg-warn-mid', ok: 'bg-ok-mid',
  };
  const barColor: Record<string, string> = {
    urgente: 'var(--brand)', atencao: 'var(--warn-mid)', ok: 'var(--ok-mid)',
  };

  return (
    <motion.div variants={fadeUp}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Próximas manutenções</p>
        <button onClick={() => navigate('/manutencoes')}
          className="text-xs font-semibold text-brand hover:underline">Ver todas</button>
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {reminders.slice(0, 3).map((r, i) => (
          <button
            key={r.id}
            onClick={() => navigate('/manutencoes')}
            className="w-full flex items-start gap-3 px-4 py-4 border-b border-border last:border-0
                       hover:bg-surface-2 active:bg-surface-3 transition-colors text-left"
          >
            <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', dotColor[r.urgency])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text leading-snug">{r.service_name}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {r.km_remaining != null
                  ? `Faltam ${r.km_remaining.toLocaleString('pt-BR')} km`
                  : r.next_service_date || '—'}
              </p>
              <ProgressBar pct={r.progress_pct} color={barColor[r.urgency]} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              <UrgencyBadge urgency={r.urgency} />
              <ChevronRight size={14} className="text-text-ghost" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Recent Notifications ──────────────────────────────── */
const notifCfg: Record<string, { bg: string; color: string; icon: typeof Info }> = {
  agendamento: { bg: 'bg-ok-bg',   color: 'text-ok',   icon: CheckCircle },
  orcamento:   { bg: 'bg-warn-bg', color: 'text-warn',  icon: FileText    },
  servico:     { bg: 'bg-ok-bg',   color: 'text-ok',   icon: TrendingUp  },
  lembrete:    { bg: 'bg-crit-bg', color: 'text-crit',  icon: AlertTriangle },
  sistema:     { bg: 'bg-info-bg', color: 'text-info',  icon: Info        },
};

function NotificationsSection({ items }: { items: Notification[] }) {
  const navigate = useNavigate();
  if (!items.length) return null;

  return (
    <motion.div variants={fadeUp}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Notificações</p>
        <button onClick={() => navigate('/notificacoes')}
          className="text-xs font-semibold text-brand hover:underline">Ver todas</button>
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {items.slice(0, 4).map((n) => {
          const { bg, color, icon: Icon } = notifCfg[n.type] || notifCfg.sistema;
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-0"
            >
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', bg, color)}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text leading-snug">{n.title}</p>
                <p className="text-xs text-text-subtle mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                </p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-brand mt-2 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Dashboard Screen ──────────────────────────────────── */
export function DashboardScreen() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => BYPASS ? Promise.resolve(mockDashboard) : dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });

  const firstName = session?.name?.split(' ')[0] || 'Usuário';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <MainLayout topbar={<Topbar notifCount={data?.unread_notifications_count} />}>
      {/* Greeting */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-xs text-text-muted font-medium">{greeting} ·{' '}
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-bold text-text mt-1 tracking-tight">
          Olá, <span className="text-brand">{firstName}</span> 👋
        </h1>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <div className="grid grid-cols-2 gap-2.5">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
            <SkeletonList count={2} />
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-5 pb-2"
          >
            <VehicleHero
              vehicle={data?.active_vehicle}
              onAdd={() => navigate('/veiculos')}
            />
            <MetricGrid data={data} />
            <QuickActions />
            <UpcomingSection reminders={data?.urgent_reminders ?? []} />
            <NotificationsSection items={data?.recent_notifications ?? []} />
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
