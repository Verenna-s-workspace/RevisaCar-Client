import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/* ═══════════════════════════════════════════════
   RevisaCar Pro — shared design tokens & primitives
   ═══════════════════════════════════════════════ */
export const C = {
  brand:  '#CC1400',
  text:   '#14161A',
  text2:  '#23272F',
  text3:  '#3a3d44',
  muted:  '#6B7078',
  subtle: '#9AA0A8',
  bg:     '#F7F6F3',
  card:   '#FFFFFF',
  border: '#E2DFD8',
  borderSoft: '#EFEDE8',
  green:  '#18B26B',
  greenDk:'#15924E',
  greenBg:'#E9F7EF',
  redBg:  '#FDEAEC',
  gold:   '#C98A00',
  goldBg: '#FFF3D6',
  info:   '#2A6FDB',
  infoBg: '#EAF1FB',
};

export const FONT_HEAD = "var(--font-heading)";

/* ─── Vehicle health helpers ────────────────────── */
const HEALTH_MAP: Record<string, number> = { v1: 86, v2: 68, v3: 78 };
export function healthFor(id?: string) {
  return id && HEALTH_MAP[id] != null ? HEALTH_MAP[id] : 82;
}
export function healthColor(score: number) {
  return score >= 80 ? C.green : score >= 60 ? '#F4A724' : C.brand;
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

/* ─── Section label ─────────────────────────────── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5 mt-1"
       style={{ color: C.subtle }}>
      {children}
    </p>
  );
}

/* ─── Card group (rounded container for rows) ───── */
export function CardGroup({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

/* ─── Menu Row ──────────────────────────────────── */
export function MenuRow({ icon, iconBg, iconColor, label, value, danger, last, onClick }: {
  icon: ReactNode; iconBg?: string; iconColor?: string;
  label: string; value?: string; danger?: boolean; last?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02] transition-colors"
      style={{ borderBottom: last ? 'none' : `1px solid ${C.borderSoft}` }}
    >
      {icon && (
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
             style={{ background: iconBg ?? C.bg, color: iconColor ?? C.muted }}>
          {icon}
        </div>
      )}
      <span className="flex-1 text-[14px] font-semibold" style={{ color: danger ? C.brand : C.text }}>
        {label}
      </span>
      {value && <span className="text-[13px]" style={{ color: C.subtle }}>{value}</span>}
      {!danger && <ChevronRight size={18} color={C.subtle} />}
    </button>
  );
}

/* ─── Toggle ────────────────────────────────────── */
export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="w-[46px] h-[27px] rounded-full flex-none transition-colors relative"
      style={{ background: on ? C.green : '#D9D6CF' }}
    >
      <span
        className="absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}
      />
    </button>
  );
}

/* ─── Toggle Row ────────────────────────────────── */
export function ToggleRow({ icon, iconBg, iconColor, label, desc, on, onChange, last }: {
  icon?: ReactNode; iconBg?: string; iconColor?: string;
  label: string; desc?: string; on: boolean; onChange: () => void; last?: boolean;
}) {
  return (
    <div className="w-full flex items-center gap-3.5 px-4 py-3.5"
         style={{ borderBottom: last ? 'none' : `1px solid ${C.borderSoft}` }}>
      {icon && (
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
             style={{ background: iconBg ?? C.bg, color: iconColor ?? C.muted }}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: C.text }}>{label}</p>
        {desc && <p className="text-[11.5px] mt-0.5 leading-[1.35]" style={{ color: C.subtle }}>{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

/* ─── Primary / Outline buttons ─────────────────── */
export function PrimaryBtn({ children, onClick, danger, disabled }: {
  children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
      style={{ background: C.brand, fontFamily: FONT_HEAD }}
    >
      {children}
    </button>
  );
}

export function OutlineBtn({ children, onClick, danger }: {
  children: ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-[15px] rounded-[14px] font-bold text-[15px] transition-all active:scale-[0.98]"
      style={{
        background: 'transparent',
        border: `1.5px solid ${danger ? C.brand : C.border}`,
        color: danger ? C.brand : C.text,
        fontFamily: FONT_HEAD,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Full-screen state (empty / error / success) ─ */
export function FullState({ icon, iconBg, iconColor, title, desc, primary, secondary }: {
  icon: ReactNode; iconBg?: string; iconColor?: string;
  title: string; desc?: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center text-center px-7" style={{ paddingTop: '18vh' }}>
      <div className="w-[96px] h-[96px] rounded-full flex items-center justify-center"
           style={{ background: iconBg ?? C.bg, color: iconColor ?? C.subtle }}>
        {icon}
      </div>
      <h2 className="text-[20px] font-extrabold mt-6" style={{ color: C.text, fontFamily: FONT_HEAD }}>{title}</h2>
      {desc && <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: C.muted }}>{desc}</p>}
      {(primary || secondary) && (
        <div className="w-full flex flex-col gap-2.5 mt-7">
          {primary && <PrimaryBtn onClick={primary.onClick}>{primary.label}</PrimaryBtn>}
          {secondary && <OutlineBtn onClick={secondary.onClick}>{secondary.label}</OutlineBtn>}
        </div>
      )}
    </div>
  );
}
