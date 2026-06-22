import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { historyApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';
import type { ServiceHistory } from '../../types';

/* ─── Timeline item ─────────────────────────────── */
function TimelineItem({ item, last, onClick }: { item: ServiceHistory; last: boolean; onClick: () => void }) {
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-none" style={{ background: C.green }}>
          <Check size={14} color="#fff" strokeWidth={3} />
        </div>
        {!last && <div className="flex-1 w-[2px] my-1" style={{ background: C.border }} />}
      </div>
      <button onClick={onClick} className="pb-5 flex-1 min-w-0 text-left active:opacity-70">
        <p className="text-[11.5px] font-semibold" style={{ color: C.subtle }}>
          {item.mileage_at_service?.toLocaleString('pt-BR')} km · {format(new Date(item.service_date), 'dd/MM/yyyy', { locale: ptBR })}
        </p>
        <div className="flex items-center justify-between mt-1 rounded-[14px] p-3.5"
             style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: C.text }}>{item.service_type}</p>
            <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>{item.workshop_name ?? 'Oficina'}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-none">
            <span className="text-[14px] font-bold tabular" style={{ color: C.text }}>
              R$ {item.total_cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <ChevronRight size={16} color={C.subtle} />
          </div>
        </div>
      </button>
    </div>
  );
}

/* ─── History / Timeline ────────────────────────── */
export function HistoryScreen() {
  const navigate = useNavigate();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  return (
    <MainLayout topbar={<Topbar title="Linha do tempo" />}>
      <div className="px-4 pt-4 pb-8">
        <p className="text-[13px] mb-4" style={{ color: C.muted }}>
          Sua jornada de manutenção por quilometragem.
        </p>

        {isLoading ? (
          <div className="flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-[80px] rounded-[14px]" />)}</div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-16 px-6">
            <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
              <Calendar size={36} color={C.subtle} strokeWidth={1.4} />
            </div>
            <h2 className="text-[17px] font-extrabold mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              Nenhum serviço ainda
            </h2>
            <p className="text-[13px] mt-2" style={{ color: C.muted }}>
              Seus serviços aparecerão aqui em uma linha do tempo por quilometragem.
            </p>
          </div>
        ) : (
          <>
            {/* Próxima manutenção */}
            <div className="rounded-[16px] p-4 mb-4 flex items-center gap-3"
                 style={{ background: '#FDEAEC', border: '1px solid rgba(229,7,26,.12)' }}>
              <div className="flex flex-col items-center flex-none">
                <span className="text-[9px] font-bold tracking-wide" style={{ color: C.brand }}>PRÓXIMA</span>
                <span className="text-[15px] font-extrabold tabular" style={{ color: C.brand, fontFamily: FONT_HEAD }}>46.200</span>
                <span className="text-[9px]" style={{ color: C.brand }}>km</span>
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold" style={{ color: C.text }}>Troca de óleo</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>Estimada para 15/05/2026</p>
              </div>
              <button onClick={() => navigate('/agendar')}
                className="text-[12px] font-bold px-3 py-1.5 rounded-[8px] text-white" style={{ background: C.brand }}>
                Agendar
              </button>
            </div>

            {/* "Você está aqui" */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.text }} />
              <span className="text-[11px] font-bold tracking-wide" style={{ color: C.text }}>VOCÊ ESTÁ AQUI · 45.000 km</span>
              <div className="flex-1 h-[1px]" style={{ background: C.border }} />
            </div>

            <div className="flex flex-col">
              {history.map((item, i) => (
                <TimelineItem key={item.id} item={item} last={i === history.length - 1}
                              onClick={() => navigate(`/servico/${item.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
