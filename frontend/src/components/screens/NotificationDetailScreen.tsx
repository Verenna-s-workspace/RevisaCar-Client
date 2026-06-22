import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck, FileText, Clock, Tag, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationsApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, PrimaryBtn } from '../ui/pro';
import type { NotificationType } from '../../types';

const ICON_CFG: Record<NotificationType, { Icon: any; bg: string; color: string; label: string }> = {
  agendamento: { Icon: CalendarCheck, bg: C.greenBg, color: C.greenDk, label: 'Agendamento' },
  orcamento:   { Icon: FileText,      bg: C.infoBg,  color: C.info,    label: 'Orçamento' },
  lembrete:    { Icon: Clock,         bg: C.redBg,   color: C.brand,   label: 'Lembrete' },
  servico:     { Icon: Wrench,        bg: '#FFF3D6', color: '#C98A00', label: 'Serviço' },
  sistema:     { Icon: Tag,           bg: C.bg,      color: C.muted,   label: 'Aviso' },
};

const CTA_LABEL: Record<string, string> = {
  '/acompanhar': 'Acompanhar serviço',
  '/orcamentos': 'Ver orçamento',
  '/agendar': 'Agendar agora',
};

export function NotificationDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: n, isLoading } = useQuery({
    queryKey: ['notification', id],
    queryFn: () => notificationsApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const cfg = n ? (ICON_CFG[n.type] ?? ICON_CFG.sistema) : ICON_CFG.sistema;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Notificação" showBack />}>
      <div className="px-4 pt-5 pb-8 flex flex-col gap-5">
        {isLoading || !n ? (
          <Skeleton className="h-[220px] rounded-[18px]" />
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-[64px] h-[64px] rounded-[18px] flex items-center justify-center" style={{ background: cfg.bg }}>
                <cfg.Icon size={28} color={cfg.color} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest mt-3" style={{ color: cfg.color }}>{cfg.label}</span>
              <h1 className="text-[20px] font-extrabold mt-1.5 px-2" style={{ color: C.text, fontFamily: FONT_HEAD }}>{n.title}</h1>
              <p className="text-[12px] mt-1.5" style={{ color: C.subtle }}>
                {format(new Date(n.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            <div className="rounded-[16px] p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-[14px] leading-relaxed" style={{ color: C.text2 }}>{n.message}</p>
            </div>

            {n.action_url && (
              <PrimaryBtn onClick={() => navigate(n.action_url!)}>
                {CTA_LABEL[n.action_url] ?? 'Ver detalhes'}
              </PrimaryBtn>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
