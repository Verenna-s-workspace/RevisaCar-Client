import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus, Gauge, RotateCcw, Wind, Wrench,
  Zap, Activity, Thermometer, Settings, ChevronRight
} from 'lucide-react';
import { remindersApi } from '../../services/api';
import { UrgencyBadge, ProgressBar, Button, EmptyState, FilterChips } from '../ui';
import { MainLayout, Topbar } from '../layout';
import type { MaintenanceReminder, Urgency } from '../../types';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

/* ─── Icon map ──────────────────────────────────────────── */
const ICONS: { key: string; icon: typeof Wrench }[] = [
  { key: 'oleo',        icon: Gauge      },
  { key: 'freio',       icon: RotateCcw  },
  { key: 'ar',          icon: Wind       },
  { key: 'correia',     icon: Zap        },
  { key: 'alinhamento', icon: Activity   },
  { key: 'vela',        icon: Thermometer},
  { key: 'revisao',     icon: Settings   },
];

function getIcon(name: string) {
  const n = name.toLowerCase();
  return ICONS.find(i => n.includes(i.key))?.icon ?? Wrench;
}

const URGENCY_STYLE: Record<Urgency, { iconBg: string; iconColor: string; bar: string; glow: string }> = {
  urgente: { iconBg: 'bg-crit-bg',  iconColor: 'text-crit',  bar: 'var(--brand)',    glow: 'shadow-[0_0_0_1px_var(--crit-border)]' },
  atencao: { iconBg: 'bg-warn-bg',  iconColor: 'text-warn',  bar: 'var(--warn-mid)', glow: 'shadow-[0_0_0_1px_var(--warn-border)]' },
  ok:      { iconBg: 'bg-ok-bg',    iconColor: 'text-ok',    bar: 'var(--ok-mid)',   glow: '' },
};

const FILTER_OPTIONS = [
  { label: 'Todos',    value: 'all'      },
  { label: 'Urgente',  value: 'urgente'  },
  { label: 'Atenção',  value: 'atencao'  },
  { label: 'Em dia',   value: 'ok'       },
] as const;
type FilterValue = typeof FILTER_OPTIONS[number]['value'];

/* ─── Reminder Item ─────────────────────────────────────── */
function ReminderItem({ item, index }: { item: MaintenanceReminder; index: number }) {
  const navigate = useNavigate();
  const Icon = getIcon(item.service_name);
  const style = URGENCY_STYLE[item.urgency];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        'bg-white rounded-2xl border border-border p-4 flex items-start gap-3.5 shadow-xs',
        style.glow
      )}
    >
      <div className={clsx(
        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
        style.iconBg, style.iconColor
      )}>
        <Icon size={21} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-bold text-sm text-text leading-tight">{item.service_name}</p>
          <UrgencyBadge urgency={item.urgency} />
        </div>

        <p className="text-xs text-text-muted mt-1">
          {item.km_remaining != null
            ? <>Faltam <span className="font-semibold tabular text-text-2">{item.km_remaining.toLocaleString('pt-BR')} km</span></>
            : item.next_service_date
              ? <>Próximo em <span className="font-semibold text-text-2">{item.next_service_date}</span></>
              : '—'
          }
          {item.interval_km && (
            <span className="text-text-subtle"> · A cada {item.interval_km.toLocaleString('pt-BR')} km</span>
          )}
        </p>

        <ProgressBar pct={item.progress_pct} color={style.bar} />

        <div className="flex items-center justify-between mt-2">
          <p className="text-2xs text-text-ghost tabular">
            {Math.round(item.progress_pct)}% do intervalo
          </p>
          {item.urgency !== 'ok' && (
            <button
              onClick={() => navigate('/agendar')}
              className="flex items-center gap-1 text-2xs font-bold text-brand hover:underline"
            >
              Agendar <ChevronRight size={11} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Scheduled Maintenance Screen ─────────────────────── */
export function ScheduledMaintenanceScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>('all');

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.list().then(r => r.data),
  });

  const urgent  = reminders.filter(r => r.urgency === 'urgente');
  const filtered = filter === 'all' ? reminders : reminders.filter(r => r.urgency === filter);

  return (
    <MainLayout topbar={<Topbar title="Manutenções Programadas" showBack />}>
      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Hero CTA */}
        {!isLoading && urgent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-br from-brand via-brand-dark to-brand-deep
                       rounded-2xl p-5 text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
                <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Ação necessária</p>
              </div>
              <p className="font-bold text-lg leading-tight mb-0.5">{urgent[0]?.service_name}</p>
              <p className="text-sm text-white/75 mb-4">
                {urgent[0]?.km_remaining != null
                  ? `Vence em ${urgent[0].km_remaining.toLocaleString('pt-BR')} km`
                  : `Vence em ${urgent[0]?.next_service_date || 'breve'}`
                }
                {urgent.length > 1 && ` · mais ${urgent.length - 1} urgente${urgent.length > 2 ? 's' : ''}`}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/agendar')}
                className="bg-white text-brand hover:bg-white/90 shadow-none"
                icon={<CalendarPlus size={15} />}
              >
                Agendar agora
              </Button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

        {/* Summary row */}
        {!isLoading && reminders.length > 0 && (
          <div className="flex gap-2">
            {[
              { label: 'Total',   count: reminders.length,                         color: 'text-text-muted' },
              { label: 'Urgente', count: reminders.filter(r => r.urgency === 'urgente').length, color: 'text-crit'      },
              { label: 'Atenção', count: reminders.filter(r => r.urgency === 'atencao').length, color: 'text-warn'      },
              { label: 'Em dia',  count: reminders.filter(r => r.urgency === 'ok').length,      color: 'text-ok'        },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex-1 bg-white border border-border rounded-xl py-2.5 text-center shadow-xs">
                <p className={clsx('text-base font-bold tabular', color)}>{count}</p>
                <p className="text-2xs text-text-subtle font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 flex gap-3 shadow-xs">
                <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-2/3 mb-2 rounded" />
                  <div className="skeleton h-3 w-1/2 mb-3 rounded" />
                  <div className="skeleton h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Wrench size={34} />}
            title="Nenhum lembrete"
            description="Seus lembretes de manutenção preventiva aparecerão aqui automaticamente."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r, i) => (
              <ReminderItem key={r.id} item={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
