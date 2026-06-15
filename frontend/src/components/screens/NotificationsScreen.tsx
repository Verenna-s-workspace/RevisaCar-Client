import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, FileText, Info, Wrench, CheckCheck, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { notificationsApi } from '../../services/api';
import { Button, EmptyState } from '../ui';
import { MainLayout, Topbar } from '../layout';
import type { Notification, NotificationType } from '../../types';
import { clsx } from 'clsx';

const TYPE_CFG: Record<NotificationType, {
  icon: typeof Bell; bg: string; color: string; label: string;
}> = {
  agendamento: { icon: CheckCircle2, bg: 'bg-ok-bg',   color: 'text-ok',   label: 'Agendamento' },
  orcamento:   { icon: FileText,     bg: 'bg-warn-bg',  color: 'text-warn',  label: 'Orçamento'   },
  servico:     { icon: Wrench,       bg: 'bg-info-bg',  color: 'text-info',  label: 'Serviço'     },
  lembrete:    { icon: Bell,         bg: 'bg-crit-bg',  color: 'text-crit',  label: 'Lembrete'    },
  sistema:     { icon: Info,         bg: 'bg-surface-3', color: 'text-text-muted', label: 'Sistema' },
};

function NotifItem({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  const cfg = TYPE_CFG[item.type] || TYPE_CFG.sistema;
  const Icon = cfg.icon;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => !item.is_read && onRead(item.id)}
      className={clsx(
        'w-full flex items-start gap-3 px-4 py-4 border-b border-border last:border-0 text-left transition-colors',
        !item.is_read ? 'bg-white hover:bg-surface-2' : 'bg-transparent hover:bg-surface-2',
      )}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg, cfg.color)}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xs font-bold text-text-subtle uppercase tracking-wide">{cfg.label}</span>
        </div>
        <p className={clsx('text-sm leading-snug', !item.is_read ? 'font-semibold text-text' : 'text-text-2')}>
          {item.title}
        </p>
        {item.message && (
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{item.message}</p>
        )}
        <p className="text-2xs text-text-ghost mt-1.5">
          {formatDistanceToNow(new Date(item.created_at), { locale: ptBR, addSuffix: true })}
        </p>
      </div>
      {!item.is_read && (
        <div className="w-2 h-2 rounded-full bg-brand mt-2 flex-shrink-0" />
      )}
    </motion.button>
  );
}

export function NotificationsScreen() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const { mutate: markAll, isPending: marking } = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('Todas marcadas como lidas');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <MainLayout
      topbar={
        <Topbar
          title="Notificações"
          showBack
          right={
            unread > 0 ? (
              <button
                onClick={() => markAll()}
                className="w-9 h-9 flex items-center justify-center text-brand
                           hover:bg-crit-bg rounded-xl transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={18} />
              </button>
            ) : undefined
          }
        />
      }
    >
      {/* Unread banner */}
      {unread > 0 && (
        <div className="mx-4 mt-4 flex items-center justify-between bg-info-bg
                        border border-info-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
            <p className="text-sm font-semibold text-info">
              {unread} não lida{unread > 1 ? 's' : ''}
            </p>
          </div>
          <Button size="xs" variant="outline" onClick={() => markAll()} loading={marking}
            className="border-info text-info hover:bg-info/10">
            Marcar todas
          </Button>
        </div>
      )}

      <div className={clsx('bg-white border-y border-border', unread > 0 ? 'mt-3' : 'mt-4')}>
        {isLoading ? (
          <div className="flex flex-col">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-border last:border-0">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <div className="skeleton h-3 w-24 mb-2 rounded" />
                  <div className="skeleton h-4 w-full mb-1.5 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={34} />}
            title="Sem notificações"
            description="Você está em dia! Novas notificações de agendamentos, orçamentos e lembretes aparecerão aqui."
          />
        ) : (
          notifications.map(n => (
            <NotifItem key={n.id} item={n} onRead={markRead} />
          ))
        )}
      </div>
    </MainLayout>
  );
}
