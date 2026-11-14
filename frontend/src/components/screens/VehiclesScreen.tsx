import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Car } from 'lucide-react';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';
import { Glass, FotoVeiculo, V } from '../visual';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import type { Vehicle } from '../../types';

/* ─── Linha do veículo (foto + dados), como na referência ── */
function VehicleRow({ v, onClick }: { v: Vehicle; onClick: () => void }) {
  const { data: health } = useVehicleHealth(v.id);
  return (
    <Glass as="button" onClick={onClick} className="w-full p-3 flex items-center gap-3">
      <div className="w-[104px] flex-none"><FotoVeiculo marca={v.brand} modelo={v.model} cor={v.color} className="w-full" /></div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="t-headline truncate" style={{ color: V.text }}>{v.brand} {v.model}</p>
          {v.is_active && (
            <span className="t-caption font-semibold px-2 py-0.5 rounded-md flex-none" style={{ background: V.okSoft, color: V.ok }}>Principal</span>
          )}
        </div>
        <p className="t-footnote mt-0.5" style={{ color: V.muted }}>{v.plate} • {v.year}{v.color ? ` • ${v.color}` : ''}</p>
        <p className="t-footnote" style={{ color: V.muted }}>
          {(v.mileage ?? 0).toLocaleString('pt-BR')} km{health ? ` • saúde ${health.overall_score}%` : ''}
        </p>
      </div>
    </Glass>
  );
}

/* ─── Meus veículos ─────────────────────────────── */
export function VehiclesScreen() {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  return (
    <MainLayout width="wide" topbar={<Topbar title="Meus veículos" />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
        {isLoading ? (
          [0,1,2].map(i => <Skeleton key={i} className="h-[76px] rounded-2xl" />)
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-20 px-6">
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
              <Car size={40} color={C.subtle} strokeWidth={1.4} />
            </div>
            <h2 className="text-[1.0625rem] font-medium mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              Nenhum veículo ainda
            </h2>
            <p className="text-[0.8125rem] leading-relaxed mt-2" style={{ color: C.muted }}>
              Adicione seu primeiro veículo para acompanhar a saúde, agendar serviços e guardar documentos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {vehicles.map(v => (
              <VehicleRow key={v.id} v={v} onClick={() => navigate(`/veiculo/${v.id}`)} />
            ))}
          </div>
        )}

        <button onClick={() => navigate('/veiculos/novo')}
          className="chip w-full lg:w-auto lg:self-start lg:px-6 flex items-center justify-center gap-2 h-12 rounded-[10px] t-headline mt-1">
          <Plus size={18} /> Adicionar veículo
        </button>
      </div>
    </MainLayout>
  );
}
