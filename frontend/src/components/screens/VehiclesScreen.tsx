import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Car, ChevronRight } from 'lucide-react';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, HealthRing, healthFor } from '../ui/pro';
import type { Vehicle } from '../../types';

/* ─── Vehicle row ───────────────────────────────── */
function VehicleRow({ v, onClick }: { v: Vehicle; onClick: () => void }) {
  const score = healthFor(v.id);
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 p-4 rounded-[16px] active:scale-[0.99] transition-transform"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="w-[52px] h-[40px] rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
        <Car size={22} color={C.subtle} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[15px] truncate" style={{ color: C.text, fontFamily: FONT_HEAD }}>
            {v.brand} {v.model}
          </p>
          {v.is_active && (
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-none"
                  style={{ background: C.greenBg, color: C.greenDk }}>Principal</span>
          )}
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>
          {v.plate} · {v.fuel_type} · {v.mileage?.toLocaleString('pt-BR')} km
        </p>
      </div>
      <HealthRing score={score} />
      <ChevronRight size={18} color={C.subtle} className="flex-none" />
    </button>
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
    <MainLayout topbar={<Topbar title="Meus veículos" />}>
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
          vehicles.map(v => (
            <VehicleRow key={v.id} v={v} onClick={() => navigate(`/veiculo/${v.id}`)} />
          ))
        )}

        <button onClick={() => navigate('/veiculos/novo')}
          className="w-full flex items-center justify-center gap-2 py-[15px] rounded-[14px] font-bold text-[14px] mt-1"
          style={{ border: `1.5px dashed ${C.border}`, color: C.brand }}>
          <Plus size={18} /> Adicionar veículo
        </button>
      </div>
    </MainLayout>
  );
}
