import { Users, Star, Droplet, Wrench } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';

const BRAND  = '#CC1400';
const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';
const GOLD   = '#C98A00';

const REWARDS = [
  { label: 'Troca de óleo grátis', pts: 800, Icon: Droplet },
  { label: 'Alinhamento grátis',   pts: 600, Icon: Wrench },
  { label: 'Indique e ganhe',      pts: 300, Icon: Users, sub: 'Por cada amigo que fizer o 1º serviço.' },
];

const POINTS = 1250;
const NEXT_LEVEL = 2000;
const pct = (POINTS / NEXT_LEVEL) * 100;

export function RewardsScreen() {
  return (
    <MainLayout topbar={<Topbar title="RevisaCar Clube" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">

        {/* Points card */}
        <div className="rounded-[20px] p-5"
             style={{ background: `linear-gradient(135deg, #1a0a00 0%, #3a1200 100%)` }}>
          <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.5)' }}>
            SEUS PONTOS
          </p>
          <p className="text-[46px] font-black data-mono" style={{ color: '#fff' }}>
            {POINTS.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Star size={14} color={GOLD} fill={GOLD} />
            <p className="text-[13px] font-bold" style={{ color: GOLD }}>Nível Ouro</p>
          </div>

          {/* Progress to next */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Ouro</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Platina · {NEXT_LEVEL.toLocaleString()}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.15)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,.5)' }}>
              Faltam {(NEXT_LEVEL - POINTS).toLocaleString()} pts para Platina
            </p>
          </div>
        </div>

        {/* Trocar pontos header */}
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Trocar pontos
          </p>
        </div>

        {/* Rewards list */}
        <div className="flex flex-col gap-3">
          {REWARDS.map(r => (
            <div key={r.label} className="rounded-[14px] p-4 flex items-center gap-3"
                 style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-none"
                   style={{ background: BG }}>
                <r.Icon size={20} color={BRAND} strokeWidth={1.9} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px]" style={{ color: TEXT }}>{r.label}</p>
                {r.sub && <p className="text-[11.5px] mt-0.5" style={{ color: SUBTLE }}>{r.sub}</p>}
              </div>
              <button className="text-[12px] font-bold px-3 py-1.5 rounded-[8px] whitespace-nowrap"
                      style={{ background: POINTS >= r.pts ? BRAND : BG,
                               color:    POINTS >= r.pts ? '#fff'  : SUBTLE }}>
                {r.pts} pts
              </button>
            </div>
          ))}
        </div>

      </div>
    </MainLayout>
  );
}
