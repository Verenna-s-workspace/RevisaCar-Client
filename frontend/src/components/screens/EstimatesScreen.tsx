import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, FileText } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { estimatesApi } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, FullState } from '../ui/pro';
import type { Estimate } from '../../types';

type Tab = 'pendente' | 'aprovado' | 'rejeitado';

function expiryLabel(valid?: string) {
  if (!valid) return null;
  const h = differenceInHours(new Date(valid), new Date());
  if (h < 0) return { text: 'Expirado', urgent: true };
  if (h < 24) return { text: `Expira em ${h}h`, urgent: true };
  return { text: `Expira em ${Math.ceil(h / 24)} dias`, urgent: false };
}

function EstimateCard({ estimate, onApprove, onReject }: {
  estimate: Estimate; onApprove: () => void; onReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const exp = expiryLabel(estimate.valid_until);
  const desc = estimate.items?.[0]?.description ?? estimate.vehicle_label ?? '—';

  return (
    <div className="rounded-[16px] p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: C.subtle }}>{estimate.number}</p>
          <p className="text-[14.5px] font-bold mt-0.5" style={{ color: C.text, fontFamily: FONT_HEAD }}>{desc}</p>
        </div>
        {estimate.status === 'pendente' && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-none"
                style={{ background: '#FFF3D6', color: '#C98A00' }}>Pendente</span>
        )}
        {estimate.status === 'aprovado' && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-none"
                style={{ background: C.greenBg, color: C.greenDk }}>Aprovado</span>
        )}
        {estimate.status === 'rejeitado' && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-none"
                style={{ background: C.redBg, color: C.brand }}>Recusado</span>
        )}
      </div>

      {/* Total + expiry */}
      <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div>
          <p className="text-[11px]" style={{ color: C.muted }}>Total</p>
          <p className="text-[20px] font-extrabold tabular" style={{ color: C.text, fontFamily: FONT_HEAD }}>
            R$ {estimate.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {exp && (
          <span className="text-[11.5px] font-bold mb-1" style={{ color: exp.urgent ? C.brand : C.muted }}>
            {exp.text}
          </span>
        )}
      </div>

      {/* Details (expandable) */}
      {open && estimate.items && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
          {estimate.items.map(it => (
            <div key={it.id} className="flex justify-between py-1.5">
              <span className="text-[13px]" style={{ color: C.text2 }}>{it.description}</span>
              <span className="text-[13px] font-semibold tabular" style={{ color: C.text }}>
                R$ {it.subtotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {estimate.discount > 0 && (
            <div className="flex justify-between py-1.5 mt-1" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
              <span className="text-[13px]" style={{ color: C.muted }}>Desconto</span>
              <span className="text-[13px] font-semibold" style={{ color: C.greenDk }}>
                -R$ {estimate.discount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.greenDk }}>
              <Shield size={13} /> Garantia 90 dias
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.greenDk }}>
              <Check size={13} /> Peças originais
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {estimate.status === 'pendente' && (
        <div className="flex gap-2.5 mt-3.5">
          <button onClick={() => setOpen(!open)}
            className="flex-1 py-2.5 rounded-[11px] text-[13px] font-bold"
            style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
            {open ? 'Fechar' : 'Detalhes'}
          </button>
          <button onClick={() => setConfirm(true)}
            className="flex-1 py-2.5 rounded-[11px] text-[13px] font-bold text-white" style={{ background: C.green }}>
            Aprovar
          </button>
        </div>
      )}
      {open && estimate.status === 'pendente' && (
        <button onClick={onReject}
          className="w-full mt-2.5 py-2.5 rounded-[11px] text-[13px] font-bold"
          style={{ border: `1.5px solid ${C.brand}`, color: C.brand }}>
          Recusar orçamento
        </button>
      )}

      {/* Approve confirmation */}
      {confirm && (
        <BottomSheet onClose={() => setConfirm(false)} title="Aprovar orçamento?">
          <p className="text-[13.5px] leading-relaxed pt-1 pb-1" style={{ color: C.muted }}>
            Você está aprovando <b style={{ color: C.text }}>{estimate.number}</b> no valor de{' '}
            <b style={{ color: C.text }}>R$ {estimate.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>.
            A oficina iniciará o serviço após a aprovação.
          </p>
          <div className="flex flex-col gap-2.5 mt-5">
            <button onClick={() => { onApprove(); setConfirm(false); }}
              className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white active:scale-[0.98]"
              style={{ background: C.green, fontFamily: FONT_HEAD }}>
              Confirmar aprovação
            </button>
            <button onClick={() => setConfirm(false)}
              className="w-full py-[15px] rounded-[14px] font-bold text-[15px]"
              style={{ border: `1.5px solid ${C.border}`, color: C.text, fontFamily: FONT_HEAD }}>
              Cancelar
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

export function EstimatesScreen() {
  const [tab, setTab] = useState<Tab>('pendente');
  const qc = useQueryClient();

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates', tab],
    queryFn: () => estimatesApi.list(tab).then(r => r.data),
    staleTime: 30_000,
  });

  const { mutate: approve } = useMutation({
    mutationFn: async (id: string) => { await estimatesApi.approve(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Orçamento aprovado!'); },
    onError: () => toast.error('Erro ao aprovar'),
  });
  const { mutate: reject } = useMutation({
    mutationFn: async (id: string) => { await estimatesApi.reject(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Orçamento recusado'); },
    onError: () => toast.error('Erro ao recusar'),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendente',  label: 'Pendentes' },
    { key: 'aprovado',  label: 'Aprovados' },
    { key: 'rejeitado', label: 'Recusados' },
  ];

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Orçamentos" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="text-[12.5px] font-bold px-4 py-2 rounded-full transition-all"
              style={tab === t.key ? { background: C.brand, color: '#fff' } : { color: C.muted, background: C.card, border: `1px solid ${C.border}` }}>
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          [0,1].map(i => <Skeleton key={i} className="h-[150px] rounded-[16px]" />)
        ) : estimates.length === 0 ? (
          <FullState
            icon={<FileText size={42} strokeWidth={1.4} />}
            title={`Nenhum orçamento ${tab === 'pendente' ? 'pendente' : tab === 'aprovado' ? 'aprovado' : 'recusado'}`}
            desc="Quando a oficina enviar um orçamento, ele aparecerá aqui para você aprovar ou recusar."
          />
        ) : (
          estimates.map(e => (
            <EstimateCard key={e.id} estimate={e} onApprove={() => approve(e.id)} onReject={() => reject(e.id)} />
          ))
        )}
      </div>
    </MainLayout>
  );
}
