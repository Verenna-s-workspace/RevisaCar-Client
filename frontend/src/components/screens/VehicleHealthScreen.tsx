import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
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

const SYSTEMS = [
  { key: 'oleo',    label: 'Óleo',     score: 65, detail: 'Trocar em breve' },
  { key: 'freios',  label: 'Freios',   score: 90, detail: 'Ótimo estado'    },
  { key: 'pneus',   label: 'Pneus',    score: 77, detail: 'Bom estado'      },
  { key: 'bateria', label: 'Bateria',  score: 82, detail: 'Bom estado'      },
];

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
              fill={TEXT} fontFamily="'Sora',sans-serif">{score}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="13" fontWeight="600"
              fill={color} fontFamily="'Plus Jakarta Sans',sans-serif">{label}</text>
      </svg>
      <p className="text-[11px] font-bold tracking-widest" style={{ color: SUBTLE }}>SAÚDE DO VEÍCULO</p>
      <p className="text-[12px] mt-1.5 text-center px-8" style={{ color: MUTED }}>
        Baseado em {SYSTEMS.length} sistemas monitorados e na sua quilometragem atual.
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
  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });

  const score = dash?.health_score ?? 86;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Saúde do veículo" showBack />}>
      <div className="px-4 pb-8">
        {isLoading ? (
          <Skeleton className="h-[160px] rounded-[18px] mt-4" />
        ) : (
          <BigArc score={score} />
        )}

        <p className="text-[12px] font-bold uppercase tracking-widest mb-3 mt-2" style={{ color: SUBTLE }}>
          Sistemas
        </p>

        <div className="flex flex-col gap-2">
          {isLoading
            ? [0,1,2,3].map(i => <Skeleton key={i} className="h-[80px] rounded-[14px]" />)
            : SYSTEMS.map(s => <SystemRow key={s.key} label={s.label} score={s.score} detail={s.detail} />)
          }
        </div>

        <button
          onClick={() => navigate('/agendar')}
          className="w-full mt-5 py-[14px] rounded-[12px] font-bold text-[14px] text-white"
          style={{ background: BRAND }}
        >
          Agendar inspeção completa
        </button>
      </div>
    </MainLayout>
  );
}
