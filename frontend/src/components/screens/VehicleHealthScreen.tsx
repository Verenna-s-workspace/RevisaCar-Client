import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vehiclesApi } from '../../services/api';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';

const BRAND  = '#CC1400';
const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';
const GREEN  = '#18B26B';
const YELLOW = '#F4A724';

const detalhe = (s: number) => (s >= 80 ? 'Em dia' : s >= 60 ? 'Perto do prazo' : 'Atrasado');

function scoreColor(s: number) {
  return s >= 80 ? GREEN : s >= 60 ? YELLOW : BRAND;
}

/* ─── Arc SVG ───────────────────────────────────────────── */
function BigArc({ score }: { score: number }) {
  const r = 72, cx = 90, cy = 96;
  const total = Math.PI * r;
  const dash  = (score / 100) * total;
  const color = scoreColor(score);
  const label = score >= 80 ? 'Bom estado' : score >= 60 ? 'Atenção necessária' : 'Estado crítico';

  return (
    <div className="flex flex-col items-center py-4">
      <svg width="180" height="110" viewBox="0 0 180 110">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
              fill="none" stroke={BORDER} strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
              fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={`${dash} ${total}`} />
        <text x={cx} y={cy-16} textAnchor="middle" fontSize="40" fontWeight="800"
              fill={TEXT} fontFamily="var(--font-heading)">{score}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="13" fontWeight="600"
              fill={color} fontFamily="'DM Sans',sans-serif">{label}</text>
      </svg>
      <p className="text-[11px] font-bold tracking-widest" style={{ color: SUBTLE }}>SAÚDE DO VEÍCULO</p>
      <p className="text-[12px] mt-1.5 text-center px-8" style={{ color: MUTED }}>
        Calculada a partir dos lembretes de manutenção do veículo.
      </p>
    </div>
  );
}

/* ─── System Row ────────────────────────────────────────── */
function SystemRow({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = scoreColor(score);
  const pct = score;

  return (
    <div className="flex flex-col gap-2 p-4 rounded-[14px]"
         style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between">
        <p className="font-bold text-[14px]" style={{ color: TEXT }}>{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular" style={{ color }}>{score}</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${color}18`, color }}>
            {detail}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: BG }}>
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
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
          <Skeleton className="h-[160px] rounded-[18px] mt-4" />
        ) : !vehicleId ? (
          <p className="text-[13.5px] mt-6 text-center" style={{ color: MUTED }}>Cadastre um veículo para acompanhar a saúde dele.</p>
        ) : isError || !health ? (
          <p className="text-[13.5px] mt-6 text-center" style={{ color: MUTED }}>Não foi possível calcular a saúde agora.</p>
        ) : (
          <>
            <BigArc score={health.overall_score} />
            <p className="text-[12px] font-bold uppercase tracking-widest mb-3 mt-2" style={{ color: SUBTLE }}>
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
          className="w-full mt-5 py-[14px] rounded-[12px] font-bold text-[14px] text-white lg:max-w-sm"
          style={{ background: BRAND }}
        >
          Agendar manutenção
        </button>
      </div>
    </MainLayout>
  );
}
