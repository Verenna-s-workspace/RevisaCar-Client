import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vehiclesApi } from '../../services/api';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { Glass, DotRing, DotProgress } from '../visual';

const BRAND  = '#CC1400';
const TEXT   = 'var(--text)';
const MUTED  = 'var(--text-2)';
const SUBTLE = 'var(--text-3)';
const GREEN  = 'var(--green)';
const YELLOW = 'var(--orange)';

const detalhe = (s: number) => (s >= 80 ? 'Em dia' : s >= 60 ? 'Perto do prazo' : 'Atrasado');

function scoreColor(s: number) {
  return s >= 80 ? GREEN : s >= 60 ? YELLOW : BRAND;
}

/* ─── Nota geral (anel de pontinhos) ───────────────────── */
function BigArc({ score }: { score: number }) {
  const label = score >= 80 ? 'Bom estado' : score >= 60 ? 'Atenção necessária' : 'Estado crítico';
  return (
    <Glass className="flex flex-col items-center py-6 mt-2">
      <DotRing value={score} label="saúde geral" size={200} />
      <p className="text-[0.9375rem] font-medium mt-2" style={{ color: scoreColor(score) }}>{label}</p>
      <p className="text-[0.75rem] mt-1 text-center px-8" style={{ color: MUTED }}>
        Calculada a partir dos lembretes de manutenção do veículo.
      </p>
    </Glass>
  );
}

/* ─── Área ──────────────────────────────────────────────── */
function SystemRow({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = scoreColor(score);
  return (
    <Glass className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-[0.9375rem]" style={{ color: TEXT }}>{label}</p>
        <span className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full" style={{ background: `${color}1A`, color }}>{detail}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-[1.75rem] leading-none font-normal tabular" style={{ color: TEXT }}>{score}%</span>
        <DotProgress pct={score} color={color} dots={20} />
      </div>
    </Glass>
  );
}

/* ─── Vehicle Health Screen ─────────────────────────────── */
export function VehicleHealthScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: vehicles = [], isLoading: carregandoVeiculos } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });
  // Veículo da URL (?veiculo=) ou o principal.
  const vehicleId = params.get('veiculo') || vehicles.find(v => v.is_active)?.id || vehicles[0]?.id;
  const veiculo = vehicles.find(v => v.id === vehicleId);
  const { data: health, isLoading: carregandoSaude, isError } = useVehicleHealth(vehicleId);
  const isLoading = carregandoVeiculos || (!!vehicleId && carregandoSaude);

  return (
    <MainLayout width="wide" showNav={false} topbar={<Topbar title={veiculo ? `Saúde · ${veiculo.model}` : 'Saúde do veículo'} showBack />}>
      <div className="px-4 pb-8">
        {isLoading ? (
          <Skeleton className="h-[160px] rounded-2xl mt-4" />
        ) : !vehicleId ? (
          <p className="text-[0.8125rem] mt-6 text-center" style={{ color: MUTED }}>Cadastre um veículo para acompanhar a saúde dele.</p>
        ) : isError || !health ? (
          <p className="text-[0.8125rem] mt-6 text-center" style={{ color: MUTED }}>Não foi possível calcular a saúde agora.</p>
        ) : (
          <>
            <BigArc score={health.overall_score} />
            <p className="text-[0.8125rem] font-medium mb-3 mt-5 px-1" style={{ color: MUTED }}>
              Por área
            </p>
            <div className="grid gap-2 lg:grid-cols-2">
              {health.categories.map(c => (
                <SystemRow key={c.name} label={c.name} score={c.score} detail={detalhe(c.score)} />
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => navigate('/agendar')}
          className="w-full mt-5 py-[14px] rounded-full font-medium text-[0.9375rem] text-white lg:max-w-sm"
          style={{ background: BRAND }}
        >
          Agendar manutenção
        </button>
      </div>
    </MainLayout>
  );
}
