import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Info } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { historyApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';

export function WarrantyScreen() {
  const { id } = useParams();
  const { data: s, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => historyApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const until = s?.warranty_until ? new Date(s.warranty_until) : null;
  const daysLeft = until ? Math.max(differenceInDays(until, new Date()), 0) : 0;
  const active = daysLeft > 0;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Garantia digital" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {isLoading || !s ? (
          <Skeleton className="h-[280px] rounded-[22px]" />
        ) : (
          <>
            {/* Hero card */}
            <div className="rounded-[20px] p-6 text-center relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg,#0C5C33,#15924E)' }}>
              <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.08)' }} />
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center relative" style={{ background: 'rgba(255,255,255,.15)' }}>
                <ShieldCheck size={32} color="#fff" />
              </div>
              <p className="text-[17px] font-medium text-white mt-4 relative" style={{ fontFamily: FONT_HEAD }}>{s.service_type}</p>
              <p className="text-[12.5px] mt-1 relative" style={{ color: 'rgba(255,255,255,.8)' }}>
                Garantia {active ? 'ativa' : 'expirada'}{s.workshop_name ? ` · ${s.workshop_name}` : ''}
              </p>

              <div className="flex items-center justify-center gap-6 mt-5 relative">
                <div>
                  <p className="text-[9.5px] tracking-widest" style={{ color: 'rgba(255,255,255,.6)' }}>VÁLIDA ATÉ</p>
                  <p className="text-[14px] font-medium text-white mt-0.5">
                    {until ? format(until, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </p>
                </div>
                <div className="w-[1px] h-8" style={{ background: 'rgba(255,255,255,.2)' }} />
                <div>
                  <p className="text-[9.5px] tracking-widest" style={{ color: 'rgba(255,255,255,.6)' }}>RESTAM</p>
                  <p className="text-[14px] font-medium text-white mt-0.5">{daysLeft} dias</p>
                </div>
              </div>
            </div>

            {/* O que a garantia cobre é definido pela oficina — o app não inventa regras. */}
            <div className="rounded-[22px] p-5 flex gap-3 glass">
              <Info size={18} color={C.muted} className="flex-none mt-0.5" />
              <p className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>
                {active
                  ? `Se notar algum problema relacionado a este serviço, procure ${s.workshop_name || 'a oficina'} e mostre esta tela. As condições da garantia são as combinadas com a oficina.`
                  : 'O prazo desta garantia terminou. Fale com a oficina se tiver dúvidas sobre o serviço.'}
              </p>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
