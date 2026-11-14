import { Users, Star, Droplet, Wrench } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';

const BRAND  = '#CC1400';
const TEXT   = 'var(--text)';
const MUTED  = 'var(--text-2)';
const SUBTLE = 'var(--text-3)';
const BG     = 'var(--card-2)';
const CARD   = 'var(--card)';
const BORDER = 'var(--sep)';
const GOLD   = 'var(--orange)';

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
        <div className="rounded-2xl p-5"
             style={{ background: `linear-gradient(135deg, #1a0a00 0%, #3a1200 100%)` }}>
          <p className="text-[0.6875rem] font-medium mb-3" style={{ color: 'rgba(255,255,255,.5)' }}>
            SEUS PONTOS
          </p>
          <p className="text-[2.125rem] font-black data-mono" style={{ color: '#fff' }}>
            {POINTS.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Star size={14} color={GOLD} fill={GOLD} />
            <p className="text-[0.8125rem] font-medium" style={{ color: GOLD }}>Nível Ouro</p>
          </div>

          {/* Progress to next */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[0.6875rem]" style={{ color: 'rgba(255,255,255,.5)' }}>Ouro</p>
              <p className="text-[0.6875rem]" style={{ color: 'rgba(255,255,255,.5)' }}>Platina · {NEXT_LEVEL.toLocaleString()}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.15)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
            </div>
            <p className="text-[0.6875rem] mt-1.5" style={{ color: 'rgba(255,255,255,.5)' }}>
              Faltam {(NEXT_LEVEL - POINTS).toLocaleString()} pts para Platina
            </p>
          </div>
        </div>

        {/* Trocar pontos header */}
        <div className="flex items-center justify-between">
          <p className="text-[0.9375rem] font-medium" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Trocar pontos
          </p>
        </div>

        {/* Rewards list */}
        <div className="flex flex-col gap-3">
          {REWARDS.map(r => (
            <div key={r.label} className="rounded-2xl p-4 flex items-center gap-3"
                 style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-none"
                   style={{ background: BG }}>
                <r.Icon size={20} color={BRAND} strokeWidth={1.9} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[0.9375rem]" style={{ color: TEXT }}>{r.label}</p>
                {r.sub && <p className="text-[0.75rem] mt-0.5" style={{ color: SUBTLE }}>{r.sub}</p>}
              </div>
              <button className="text-[0.75rem] font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
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
