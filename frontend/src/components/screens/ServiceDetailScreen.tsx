import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ClipboardCheck, ShieldCheck, Download, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { historyApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';
import { SHOWCASE } from '../../config/features';

export function ServiceDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: s, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => historyApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Detalhes do serviço" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {isLoading || !s ? (
          <>
            <Skeleton className="h-[120px] rounded-[18px]" />
            <Skeleton className="h-[180px] rounded-[18px]" />
          </>
        ) : (
          <>
            {/* Header */}
            <div className="rounded-[18px] p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: C.greenBg, color: C.greenDk }}>
                  ✓ Concluído
                </span>
                <span className="text-[12px]" style={{ color: C.subtle }}>
                  {format(new Date(s.service_date), 'dd/MM/yyyy', { locale: ptBR })} · {s.mileage_at_service?.toLocaleString('pt-BR')} km
                </span>
              </div>
              <p className="text-[19px] font-extrabold mt-1" style={{ color: C.text, fontFamily: FONT_HEAD }}>
                {s.service_type}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin size={14} color={C.subtle} />
                <span className="text-[12.5px]" style={{ color: C.muted }}>{s.workshop_name ?? 'Oficina'}</span>
              </div>
            </div>

            {/* Itens */}
            <div className="rounded-[18px] p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-[12px] font-bold uppercase tracking-wide mb-3" style={{ color: C.subtle }}>Itens do serviço</p>
              <div className="flex flex-col gap-2.5">
                {s.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-none" style={{ background: C.greenBg }}>
                      <Check size={11} color={C.greenDk} strokeWidth={3} />
                    </div>
                    <span className="flex-1 text-[13.5px]" style={{ color: C.text2 }}>{it.description}</span>
                    {it.part_replaced && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.infoBg, color: C.info }}>
                        peça trocada
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                <span className="text-[14px] font-semibold" style={{ color: C.muted }}>Total</span>
                <span className="text-[20px] font-extrabold tabular" style={{ color: C.text, fontFamily: FONT_HEAD }}>
                  R$ {s.total_cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notas */}
            {s.mechanic_notes && (
              <div className="rounded-[18px] p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <p className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: C.subtle }}>Notas do mecânico</p>
                <p className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>{s.mechanic_notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="rounded-[16px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {SHOWCASE && s.inspection_id && (
                <button onClick={() => navigate(`/servico/${s.id}/inspecao`)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02]"
                  style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.infoBg }}>
                    <ClipboardCheck size={18} color={C.info} />
                  </div>
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: C.text }}>Ver relatório de inspeção</span>
                  <span className="text-[18px]" style={{ color: C.subtle }}>›</span>
                </button>
              )}
              {s.warranty_until && (
                <button onClick={() => navigate(`/garantia/${s.id}`)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02]"
                  style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.greenBg }}>
                    <ShieldCheck size={18} color={C.greenDk} />
                  </div>
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: C.text }}>Garantia digital</span>
                  <span className="text-[18px]" style={{ color: C.subtle }}>›</span>
                </button>
              )}
              <button onClick={() => toast.success('Baixando nota fiscal...')}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02]">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
                  <Download size={18} color={C.muted} />
                </div>
                <span className="flex-1 text-[14px] font-semibold" style={{ color: C.text }}>Baixar nota fiscal</span>
                <span className="text-[18px]" style={{ color: C.subtle }}>›</span>
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
