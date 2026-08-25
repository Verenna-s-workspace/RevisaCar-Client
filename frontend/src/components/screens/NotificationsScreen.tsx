import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck, FileText, Clock, Tag, Wrench, Bell } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';
import type { Notification, NotificationType } from '../../types';

// Tipo diferenciado pelo ÍCONE, com acento único da marca (sem tiles multicoloridos).
const ICON_CFG: Record<NotificationType, { Icon: any; bg: string; color: string }> = {
  agendamento: { Icon: CalendarCheck, bg: C.borderSoft, color: C.brand },
  orcamento:   { Icon: FileText,      bg: C.borderSoft, color: C.brand },
  lembrete:    { Icon: Clock,         bg: C.borderSoft, color: C.brand },
  servico:     { Icon: Wrench,        bg: C.borderSoft, color: C.brand },
  sistema:     { Icon: Tag,           bg: C.borderSoft, color: C.muted },
};

function NotifRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const cfg = ICON_CFG[n.type] ?? ICON_CFG.sistema;
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 p-3.5 rounded-[14px] text-left transition-colors"
      style={{ background: n.is_read ? 'transparent' : C.card, border: `1px solid ${n.is_read ? 'transparent' : C.border}` }}>
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: cfg.bg }}>
        <cfg.Icon size={17} color={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[13.5px] flex-1 truncate" style={{ color: C.text }}>{n.title}</p>
          {!n.is_read && <span className="w-2 h-2 rounded-full flex-none" style={{ background: C.brand }} />}
        </div>
        <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: C.muted }}>{n.message}</p>
        <p className="text-[10.5px] mt-1" style={{ color: C.subtle }}>
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </button>
  );
}

export function NotificationsScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
    staleTime: 30_000,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => { await notificationsApi.markRead(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const { mutate: markAll } = useMutation({
    mutationFn: async () => { await notificationsApi.markAllRead(); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const today = notifs.filter(n => isToday(new Date(n.created_at)));
  const older = notifs.filter(n => !isToday(new Date(n.created_at)));
  const hasUnread = notifs.some(n => !n.is_read);

  const open = (n: Notification) => { if (!n.is_read) markRead(n.id); navigate(`/notificacoes/${n.id}`); };

  return (
    <MainLayout topbar={
      <Topbar title="Notificações" showBack right={
        hasUnread ? (
          <button onClick={() => markAll()} className="text-[12px] font-semibold pr-1" style={{ color: C.brand }}>
            Limpar
          </button>
        ) : undefined
      } />
    }>
      <div className="px-4 pt-3 pb-8">
        {isLoading ? (
          <div className="flex flex-col gap-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-[72px] rounded-[14px]" />)}</div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-24 px-6">
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
              <Bell size={38} color={C.subtle} strokeWidth={1.4} />
            </div>
            <h2 className="text-[18px] font-extrabold mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              Tudo tranquilo por aqui
            </h2>
            <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: C.muted }}>
              Você não tem novas notificações. Avisaremos quando houver lembretes de manutenção ou orçamentos.
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2 mt-1" style={{ color: C.subtle }}>Hoje</p>
                <div className="flex flex-col gap-1.5 mb-5">
                  {today.map(n => <NotifRow key={n.id} n={n} onClick={() => open(n)} />)}
                </div>
              </>
            )}
            {older.length > 0 && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.subtle }}>Anteriores</p>
                <div className="flex flex-col gap-1.5">
                  {older.map(n => <NotifRow key={n.id} n={n} onClick={() => open(n)} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
