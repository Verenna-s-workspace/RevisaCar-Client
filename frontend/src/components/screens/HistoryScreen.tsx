import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { historyApi, remindersApi, vehiclesApi } from '../../services/api';
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
        <div className="flex items-center justify-between mt-1 rounded-[22px] p-3.5 glass">
          <div className="min-w-0">
            <p className="text-[14px] font-medium truncate" style={{ color: C.text }}>{item.service_type}</p>
            <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>{item.workshop_name ?? 'Oficina'}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-none">
            <span className="text-[14px] font-medium tabular" style={{ color: C.text }}>
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
  // Dados reais para "próxima" e "você está aqui" (antes eram 46.200 km / 45.000 km fixos).
  const { data: lembretes = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.list().then(r => r.data),
    staleTime: 60_000,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });
  const kmAtual = (vehicles.find(v => v.is_active) ?? vehicles[0])?.mileage;
  const ORDEM: Record<string, number> = { urgente: 0, atencao: 1, ok: 2 };
  const proxima = [...lembretes].sort((a, b) => (ORDEM[a.urgency] ?? 3) - (ORDEM[b.urgency] ?? 3))[0];
  const dataLocal = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

  return (
    <MainLayout width="wide" topbar={<Topbar title="Linha do tempo" />}>
      <div className="px-4 pt-4 pb-8">
        <p className="text-[13px] mb-4" style={{ color: C.muted }}>
          Sua jornada de manutenção por quilometragem.
        </p>

        {isLoading ? (
          <div className="flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-[80px] rounded-[22px]" />)}</div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-16 px-6">
            <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
              <Calendar size={36} color={C.subtle} strokeWidth={1.4} />
            </div>
            <h2 className="text-[17px] font-medium mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              Nenhum serviço ainda
            </h2>
            <p className="text-[13px] mt-2" style={{ color: C.muted }}>
              Seus serviços aparecerão aqui em uma linha do tempo por quilometragem.
            </p>
          </div>
        ) : (
          <>
            {/* Próxima manutenção (lembrete mais urgente) */}
            {proxima && (
            <div className="glass rounded-[24px] p-4 mb-5 flex items-center gap-3.5">
              <div className="w-[60px] h-[60px] rounded-full nav-raised flex flex-col items-center justify-center flex-none"
                   style={{ boxShadow: '0 8px 18px rgba(204,20,0,0.28)' }}>
                <span className="text-[9.5px] opacity-80">próxima</span>
                <span className="text-[13px] font-medium tabular leading-tight">
                  {proxima.next_service_km != null ? `${Math.round(proxima.next_service_km / 1000)} mil` : '—'}
                </span>
                <span className="text-[9.5px] opacity-80">km</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate" style={{ color: C.text }}>{proxima.service_name}</p>
                {proxima.next_service_km != null && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>Aos {proxima.next_service_km.toLocaleString('pt-BR')} km</p>
                )}
                {proxima.next_service_date && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>
                    Estimada para {format(dataLocal(proxima.next_service_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
              </div>
              <button onClick={() => navigate('/agendar')}
                className="chip-active text-[12.5px] font-medium h-9 px-4 rounded-full">
                Agendar
              </button>
            </div>
            )}

            {/* "Você está aqui" (km atual do veículo principal) */}
            {kmAtual != null && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.brand, boxShadow: '0 0 0 4px rgba(204,20,0,0.12)' }} />
              <span className="text-[12.5px] font-medium" style={{ color: C.text }}>
                Você está aqui · {kmAtual.toLocaleString('pt-BR')} km
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(22,24,28,0.08)' }} />
            </div>
            )}

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
