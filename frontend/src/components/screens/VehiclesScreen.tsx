import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Car } from 'lucide-react';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';
import { Glass, StatTile, CarIllustration, V } from '../visual';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import type { Vehicle } from '../../types';

/* ─── Card do veículo ──────────────────────────── */
function VehicleRow({ v, onClick }: { v: Vehicle; onClick: () => void }) {
  const { data: health } = useVehicleHealth(v.id);
  return (
    <Glass as="button" onClick={onClick} className="w-full p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="text-[17px] font-normal truncate" style={{ color: V.text }}>{v.brand} {v.model}</p>
          <p className="text-[12px] mt-0.5 data-mono" style={{ color: V.subtle }}>{v.plate} · {v.year}</p>
        </div>
        {v.is_active && (
          <span className="text-[11px] px-2.5 py-1 rounded-full flex-none" style={{ background: V.okSoft, color: '#13804B' }}>Principal</span>
        )}
      </div>
      <CarIllustration color={v.color} className="w-full max-w-[320px] mx-auto my-2" />
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Saúde" value={health ? `${health.overall_score}%` : '—'} />
        <StatTile label="Km" value={(v.mileage ?? 0).toLocaleString('pt-BR')} />
        <StatTile label="Cor" value={<span className="text-[15px]">{v.color || '—'}</span>} />
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
          [0,1,2].map(i => <Skeleton key={i} className="h-[76px] rounded-[16px]" />)
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-20 px-6">
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center" style={{ background: C.bg }}>
              <Car size={40} color={C.subtle} strokeWidth={1.4} />
            </div>
            <h2 className="text-[18px] font-extrabold mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              Nenhum veículo ainda
            </h2>
            <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: C.muted }}>
              Adicione seu primeiro veículo para acompanhar a saúde, agendar serviços e guardar documentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
            {vehicles.map(v => (
              <VehicleRow key={v.id} v={v} onClick={() => navigate(`/veiculo/${v.id}`)} />
            ))}
          </div>
        )}

        <button onClick={() => navigate('/veiculos/novo')}
          className="chip w-full lg:w-auto lg:self-start lg:px-6 flex items-center justify-center gap-2 h-12 rounded-full font-medium text-[14px] mt-1"
          style={{ color: C.brand }}>
          <Plus size={18} /> Adicionar veículo
        </button>
      </div>
    </MainLayout>
  );
}
