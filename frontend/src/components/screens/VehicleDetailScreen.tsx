import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Pencil, ClipboardList, Wrench, FolderOpen, QrCode, Activity, Settings2, CalendarPlus, ChevronRight,
} from 'lucide-react';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { Glass, IconCircle, FotoVeiculo, V } from '../visual';

const COMBUSTIVEL: Record<string, string> = { flex: 'Flex', gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', eletrico: 'Elétrico', hibrido: 'Híbrido', gnv: 'GNV' };

function Ficha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="t-caption" style={{ color: V.muted }}>{rotulo}</p>
      <p className="t-subhead font-semibold truncate mt-0.5" style={{ color: V.text }}>{valor}</p>
    </div>
  );
}

export function VehicleDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!).then(r => r.data),
    enabled: !!id,
  });
  const { data: health } = useVehicleHealth(id);

  const atalhos = [
    { icon: ClipboardList, label: 'Histórico de serviços', to: '/historico' },
    { icon: Wrench, label: 'Manutenções programadas', to: '/manutencoes' },
    { icon: Activity, label: health ? `Saúde do veículo · ${health.overall_score}%` : 'Saúde do veículo', to: `/saude?veiculo=${id}` },
    { icon: FolderOpen, label: 'Documentos', to: '/documentos' },
    { icon: QrCode, label: 'QR do veículo', to: '/qr' },
    { icon: Settings2, label: 'Configurações do veículo', to: `/veiculo/${id}/editar` },
  ];

  return (
    <MainLayout width="wide" showNav={false} topbar={
      <Topbar title={v ? `${v.model} • ${v.plate}` : 'Veículo'} showBack
        right={<IconCircle label="Editar veículo" onClick={() => navigate(`/veiculo/${id}/editar`)}><Pencil size={19} /></IconCircle>} />
    }>
      <div className="px-4 pb-8">
        {isLoading || !v ? (
          <div className="flex flex-col gap-4"><Skeleton className="h-[200px] rounded-2xl" /><Skeleton className="h-[120px] rounded-2xl" /></div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
            <div>
              <FotoVeiculo marca={v.brand} modelo={v.model} cor={v.color} className="w-full max-w-[420px] mx-auto block" />
              <div className="grid grid-cols-3 gap-x-3 gap-y-4 mt-4 px-1">
                <Ficha rotulo="Modelo" valor={v.model} />
                <Ficha rotulo="Ano" valor={String(v.year)} />
                <Ficha rotulo="Combustível" valor={COMBUSTIVEL[v.fuel_type] ?? v.fuel_type} />
                <Ficha rotulo="Quilometragem" valor={`${v.mileage?.toLocaleString('pt-BR')} km`} />
                <Ficha rotulo="Cor" valor={v.color || '—'} />
                <Ficha rotulo="Renavam" valor={v.renavam || '—'} />
              </div>
            </div>

            <div className="mt-5 lg:mt-0 flex flex-col gap-4">
              <Glass className="overflow-hidden">
                {atalhos.map((a, i) => (
                  <button key={a.label} onClick={() => navigate(a.to)}
                    className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left press-row"
                    style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <a.icon size={20} strokeWidth={1.7} style={{ color: V.text }} className="flex-none" />
                    <span className="flex-1 t-subhead font-medium" style={{ color: V.text }}>{a.label}</span>
                    <ChevronRight size={18} color="var(--text-3)" />
                  </button>
                ))}
              </Glass>
              <button onClick={() => navigate('/agendar')}
                className="w-full h-12 rounded-[10px] t-headline text-white flex items-center justify-center gap-2 active:brightness-90"
                style={{ background: 'var(--tint-fill)' }}>
                <CalendarPlus size={19} /> Agendar manutenção
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
