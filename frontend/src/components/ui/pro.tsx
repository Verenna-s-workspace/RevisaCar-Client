import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/* ═══════════════════════════════════════════════
   RevisaCar Pro — shared design tokens & primitives
   ═══════════════════════════════════════════════ */
export const C = {
  brand:  'var(--tint)',
  text:   'var(--text)',
  text2:  'var(--text)',
  text3:  'var(--text-2)',
  muted:  'var(--text-2)',
  subtle: 'var(--text-3)',
  bg:     'var(--card-2)',
  card:   'var(--card)',
  border: 'var(--sep)',
  borderSoft: 'var(--sep)',
  green:  'var(--green)',
  greenDk:'var(--green)',
  greenBg:'var(--green-soft)',
  redBg:  'var(--red-soft)',
  gold:   'var(--orange)',
  goldBg: 'var(--orange-soft)',
  info:   'var(--blue)',
  infoBg: 'var(--blue-soft)',
};

export const FONT_HEAD = "var(--font-heading)";

/* ─── Vehicle health helpers ────────────────────── */
// A nota vem do backend (hooks/useVehicleHealth); aqui só cor e rótulo.
export function healthColor(score: number) {
  return score >= 80 ? C.green : score >= 60 ? 'var(--orange)' : C.brand;
}
export function healthLabel(score: number) {
  return score >= 80 ? 'Bom estado' : score >= 60 ? 'Atenção' : 'Crítico';
}

/* ─── Small health ring (inline use in lists) ───── */
export function HealthRing({ score, size = 46 }: { score: number; size?: number }) {
  const r = size / 2 - 3;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const color = healthColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.border} strokeWidth="3.5" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={`${(score/100)*circ} ${circ}`} transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx + 4} textAnchor="middle" fontSize={size * 0.3} fontWeight="800"
            fill={C.text} fontFamily="var(--font-heading)">{score}</text>
    </svg>
  );
}

/* ─── Cabeçalho de seção (lista agrupada) ────────── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="t-footnote mb-1.5 mt-1 px-4" style={{ color: C.subtle }}>
      {children}
    </p>
  );
}

/* ─── Lista agrupada (inset grouped) ───────────── */
export function CardGroup({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {children}
    </div>
  );
}

/* ─── Ícone em quadrado colorido (como nos Ajustes do iPhone) ── */
function IconeAjustes({ children, bg }: { children: ReactNode; bg?: string }) {
  return (
    <div className="w-[26px] h-[26px] flex items-center justify-center flex-none [&>svg]:w-[19px] [&>svg]:h-[19px]"
         style={{ color: bg ? 'var(--red)' : 'var(--text)' }}>
      {children}
    </div>
  );
}

/* ─── Linha de menu ─────────────────────────────── */
export function MenuRow({ icon, iconBg, label, value, danger, last, onClick }: {
  icon: ReactNode; iconBg?: string; iconColor?: string;
  label: string; value?: string; danger?: boolean; last?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 pl-4 text-left press-row min-h-[44px]">
      {icon && !danger && <IconeAjustes bg={iconBg && iconBg.startsWith('var(--red') ? 'var(--red)' : undefined}>{icon}</IconeAjustes>}
      <span className="flex-1 flex items-center gap-2 py-[11px] pr-4 min-w-0"
            style={{ boxShadow: last ? 'none' : `0 0.5px 0 ${C.border}` }}>
        <span className={`flex-1 t-body truncate ${danger ? 'text-center' : ''}`} style={{ color: danger ? 'var(--red)' : C.text }}>
          {label}
        </span>
        {value && <span className="t-body" style={{ color: C.subtle }}>{value}</span>}
        {!danger && <ChevronRight size={17} strokeWidth={2.4} color="var(--text-3)" style={{ opacity: 0.6 }} />}
      </span>
    </button>
  );
}

/* ─── Interruptor (iOS) ─────────────────────────── */
export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className="w-[51px] h-[31px] rounded-full flex-none transition-colors duration-200 relative"
      style={{ background: on ? 'var(--green)' : 'var(--fill)' }}
    >
      <span
        className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white transition-all duration-200"
        style={{ left: on ? '22px' : '2px', boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)' }}
      />
    </button>
  );
}

/* ─── Linha com interruptor ─────────────────────── */
export function ToggleRow({ icon, iconBg, label, desc, on, onChange, last }: {
  icon?: ReactNode; iconBg?: string; iconColor?: string;
  label: string; desc?: string; on: boolean; onChange: () => void; last?: boolean;
}) {
  return (
    <div className="w-full flex items-center gap-3 pl-4 min-h-[44px]">
      {icon && <IconeAjustes bg={iconBg}>{icon}</IconeAjustes>}
      <div className="flex-1 flex items-center gap-3 py-[9px] pr-4 min-w-0" style={{ boxShadow: last ? 'none' : `0 0.5px 0 ${C.border}` }}>
        <div className="flex-1 min-w-0">
          <p className="t-body" style={{ color: C.text }}>{label}</p>
          {desc && <p className="t-footnote mt-0.5" style={{ color: C.subtle }}>{desc}</p>}
        </div>
        <Toggle on={on} onChange={onChange} />
      </div>
    </div>
  );
}

/* ─── Botões (iOS: preenchido / cinza) ──────────── */
export function PrimaryBtn({ children, onClick, disabled, type = 'button' }: {
  children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-[10px] t-headline text-white transition active:brightness-90 disabled:opacity-40"
      style={{ background: 'var(--tint-fill)' }}
    >
      {children}
    </button>
  );
}

export function OutlineBtn({ children, onClick, danger, disabled }: {
  children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-[10px] t-headline disabled:opacity-40 transition active:scale-[0.99]"
      style={{ color: danger ? 'var(--red)' : 'var(--tint)', border: `1.5px solid ${danger ? 'var(--red)' : 'var(--tint)'}`, background: 'var(--card)' }}
    >
      {children}
    </button>
  );
}

/* ─── Estado de tela cheia (vazio / erro) ────────── */
export function FullState({ icon, iconColor, title, desc, primary, secondary }: {
  icon: ReactNode; iconBg?: string; iconColor?: string;
  title: string; desc?: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center text-center px-8 max-w-[420px] mx-auto" style={{ paddingTop: '12vh' }}>
      <div className="[&>svg]:w-14 [&>svg]:h-14" style={{ color: iconColor ?? 'var(--text-3)' }}>{icon}</div>
      <h2 className="t-title2 mt-4" style={{ color: C.text }}>{title}</h2>
      {desc && <p className="t-subhead mt-2" style={{ color: C.muted }}>{desc}</p>}
      {(primary || secondary) && (
        <div className="w-full flex flex-col gap-2.5 mt-6">
          {primary && <PrimaryBtn onClick={primary.onClick}>{primary.label}</PrimaryBtn>}
          {secondary && <OutlineBtn onClick={secondary.onClick}>{secondary.label}</OutlineBtn>}
        </div>
      )}
    </div>
  );
}
