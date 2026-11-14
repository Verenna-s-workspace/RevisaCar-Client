import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronDown, Store, Info } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { orcamentosApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, FullState } from '../ui/pro';
import type { OrcamentoOficina, OrcamentoStatus } from '../../types';

// Orçamentos que as oficinas ENVIARAM para as OS do cliente (somente leitura).
// A aprovação acontece pelo link que a oficina manda (WhatsApp) ou direto com ela.

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (iso: string | null) => (iso ? format(new Date(iso), "dd 'de' MMM", { locale: ptBR }) : '');

const STATUS: Record<OrcamentoStatus, { label: string; bg: string; color: string }> = {
  enviado:  { label: 'Aguardando você', bg: C.goldBg,  color: C.gold },
  aprovado: { label: 'Aprovado',        bg: C.greenBg, color: C.greenDk },
  recusado: { label: 'Recusado',        bg: C.redBg,   color: C.brand },
};

function validade(o: OrcamentoOficina) {
  if (o.status !== 'enviado' || !o.validade_ate) return null;
  const dias = differenceInCalendarDays(new Date(o.validade_ate), new Date());
  if (dias < 0) return { text: 'Validade vencida', urgent: true };
  if (dias === 0) return { text: 'Vale até hoje', urgent: true };
  return { text: `Vale por mais ${dias} dia${dias > 1 ? 's' : ''}`, urgent: dias <= 2 };
}

const TIPO_ITEM: Record<string, string> = { peca: 'Peça', servico: 'Serviço', mao_de_obra: 'Mão de obra' };

function OrcamentoCard({ o }: { o: OrcamentoOficina }) {
  const [aberto, setAberto] = useState(o.status === 'enviado');
  const st = STATUS[o.status] ?? STATUS.enviado;
  const val = validade(o);

  return (
    <article className="rounded-[16px] p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: C.subtle }}>
            <Store size={13} /> {o.oficina.nome || 'Oficina'}
            {o.os_num && <span>· OS {o.os_num}</span>}
            {o.versao > 1 && <span>· versão {o.versao}</span>}
          </p>
          <p className="text-[14.5px] font-bold mt-0.5 truncate" style={{ color: C.text, fontFamily: FONT_HEAD }}>
            {o.vehicle_label || 'Seu veículo'}
          </p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-none"
              style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </div>

      <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div>
          <p className="text-[11px]" style={{ color: C.muted }}>Total</p>
          <p className="text-[20px] font-extrabold tabular" style={{ color: C.text, fontFamily: FONT_HEAD }}>{brl(o.total)}</p>
        </div>
        <div className="text-right">
          {val && (
            <p className="text-[11.5px] font-bold" style={{ color: val.urgent ? C.brand : C.muted }}>{val.text}</p>
          )}
          {o.enviado_em && <p className="text-[11px]" style={{ color: C.subtle }}>Enviado em {data(o.enviado_em)}</p>}
        </div>
      </div>

      {aberto && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
          {o.itens.length === 0 ? (
            <p className="text-[13px]" style={{ color: C.muted }}>A oficina não detalhou os itens.</p>
          ) : o.itens.map((it, i) => (
            <div key={i} className="flex justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="text-[13px]" style={{ color: C.text2 }}>{it.descricao}</p>
                <p className="text-[11px]" style={{ color: C.subtle }}>
                  {TIPO_ITEM[it.tipo] ?? it.tipo}{it.marca ? ` · ${it.marca}` : ''}
                  {it.quantidade !== 1 ? ` · ${it.quantidade.toLocaleString('pt-BR')} × ${brl(it.preco_unitario)}` : ''}
                </p>
              </div>
              <span className="text-[13px] font-semibold tabular flex-none" style={{ color: C.text }}>{brl(it.subtotal)}</span>
            </div>
          ))}
          {o.observacoes && (
            <p className="text-[12.5px] mt-2 p-3 rounded-[12px]" style={{ background: C.bg, color: C.text2 }}>{o.observacoes}</p>
          )}
          {o.status === 'recusado' && o.motivo_recusa && (
            <p className="text-[12px] mt-2" style={{ color: C.muted }}>Motivo da recusa: {o.motivo_recusa}</p>
          )}
          {o.status === 'enviado' && (
            <p className="text-[12px] mt-3 flex gap-2 leading-snug" style={{ color: C.muted }}>
              <Info size={14} className="flex-none mt-0.5" />
              Para aprovar ou recusar, use o link que a oficina enviou para você ou fale direto com ela.
            </p>
          )}
        </div>
      )}

      <button onClick={() => setAberto(a => !a)} aria-expanded={aberto}
        className="w-full mt-3 py-2.5 rounded-[11px] text-[13px] font-bold flex items-center justify-center gap-1.5"
        style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
        {aberto ? 'Ocultar itens' : `Ver itens (${o.itens.length})`}
        <ChevronDown size={15} style={{ transform: aberto ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
    </article>
  );
}

type Tab = OrcamentoStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'enviado',  label: 'Aguardando' },
  { key: 'aprovado', label: 'Aprovados' },
  { key: 'recusado', label: 'Recusados' },
];

export function EstimatesScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('enviado');

  const { data: orcamentos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orcamentos', tab],
    queryFn: () => orcamentosApi.list(tab).then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Orçamentos" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap" role="tablist">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className="text-[12.5px] font-bold px-4 py-2 rounded-full transition-all"
              style={tab === t.key ? { background: C.brand, color: '#fff' } : { color: C.muted, background: C.card, border: `1px solid ${C.border}` }}>
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          [0, 1].map(i => <Skeleton key={i} className="h-[150px] rounded-[16px]" />)
        ) : isError ? (
          <FullState icon={<FileText size={42} strokeWidth={1.4} />} title="Não foi possível carregar"
            desc="Verifique sua conexão e tente de novo." primary={{ label: 'Tentar de novo', onClick: () => refetch() }} />
        ) : orcamentos.length === 0 ? (
          <FullState
            icon={<FileText size={42} strokeWidth={1.4} />}
            title={tab === 'enviado' ? 'Nenhum orçamento aguardando' : tab === 'aprovado' ? 'Nenhum orçamento aprovado' : 'Nenhum orçamento recusado'}
            desc="Quando uma oficina em que você está cadastrado enviar um orçamento, ele aparece aqui."
            secondary={{ label: 'Minhas oficinas', onClick: () => navigate('/oficinas') }}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orcamentos.map(o => <OrcamentoCard key={o.id} o={o} />)}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
