import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export { CarIllustration } from './CarIllustration';

/*
 * Linguagem visual do app do cliente: fundo creme quente, cards translúcidos
 * ("vidro"), cantos bem arredondados, tipografia leve e um único acento — o
 * vermelho da marca (#CC1400). Gráficos em pontinhos.
 */
export const V = {
  brand: '#CC1400',
  brandSoft: '#FDECEA',
  text: '#16181C',
  muted: '#7A7F87',
  subtle: '#A3A8AF',
  line: 'rgba(22,24,28,0.06)',
  tile: 'rgba(247,245,242,0.9)',
  ok: '#1FA463',
  okSoft: '#E6F6EE',
  warn: '#E0A100',
  warnSoft: '#FFF5D9',
};

/** Card translúcido padrão. */
export function Glass({ children, className, as: Tag = 'div', onClick }: {
  children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'button'; onClick?: () => void;
}) {
  return (
    <Tag onClick={onClick} className={clsx('glass rounded-[24px]', onClick && 'text-left transition-transform active:scale-[0.99]', className)}>
      {children}
    </Tag>
  );
}

/** Bloco de métrica (ex.: "Freios · 92%"). */
export function StatTile({ label, value, icon, hint, className }: {
  label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; className?: string;
}) {
  return (
    <div className={clsx('rounded-[18px] p-3.5 flex flex-col gap-2 min-w-0', className)} style={{ background: V.tile }}>
      {icon && (
        <span className="w-7 h-7 rounded-full flex items-center justify-center bg-white/90" style={{ color: V.muted }}>{icon}</span>
      )}
      <span className="text-[12px] leading-tight" style={{ color: V.muted }}>{label}</span>
      <span className="text-[20px] leading-none font-medium tabular" style={{ color: V.text }}>{value}</span>
      {hint}
    </div>
  );
}

/** Botão em pílula branca (chips de ação no topo das telas). */
export function Chip({ children, onClick, icon, active }: {
  children?: ReactNode; onClick?: () => void; icon?: ReactNode; active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('chip flex-none inline-flex items-center gap-1.5 h-10 rounded-full text-[13px] font-medium whitespace-nowrap',
        children ? 'px-4' : 'w-10 justify-center', active && 'chip-active')}>
      {icon}{children}
    </button>
  );
}

/** Botão redondo de ícone (voltar, ações no cabeçalho). */
export function IconCircle({ children, onClick, label, className }: {
  children: ReactNode; onClick?: () => void; label: string; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={clsx('chip w-10 h-10 rounded-full flex items-center justify-center flex-none', className)}>
      {children}
    </button>
  );
}

/** Selo de prioridade (Urgente / Atenção / Em dia). */
export function PriorityBadge({ urgency }: { urgency: 'urgente' | 'atencao' | 'ok' | string }) {
  const s = urgency === 'urgente'
    ? { t: 'Urgente', bg: V.brandSoft, c: V.brand }
    : urgency === 'atencao' ? { t: 'Atenção', bg: V.warnSoft, c: '#A87800' } : { t: 'Em dia', bg: V.okSoft, c: '#13804B' };
  return <span className="text-[11px] font-medium px-2.5 py-1 rounded-full flex-none" style={{ background: s.bg, color: s.c }}>{s.t}</span>;
}

/** Linha de pontinhos de progresso (0–100). */
export function DotProgress({ pct, color = V.brand, dots = 24 }: { pct: number; color?: string; dots?: number }) {
  const on = Math.round((Math.max(0, Math.min(100, pct)) / 100) * dots);
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {Array.from({ length: dots }, (_, i) => (
        <span key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: i < on ? color : 'rgba(22,24,28,0.12)' }} />
      ))}
    </div>
  );
}

/** Gráfico de barras em pontinhos (ex.: custo de manutenção por mês). */
export function DotBars({ data, color = V.brand, height = 150, format }: {
  data: { label: string; value: number }[]; color?: string; height?: number; format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  const linhas = 14;
  const fmt = format ?? ((v: number) => v.toLocaleString('pt-BR'));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height }} role="img"
           aria-label={data.map(d => `${d.label}: ${fmt(d.value)}`).join('; ')}>
        {data.map(d => {
          const n = d.value > 0 ? Math.max(1, Math.round((d.value / max) * linhas)) : 0;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <span className="absolute -top-1 text-[10.5px] font-medium opacity-0 group-hover:opacity-100 transition-opacity tabular"
                    style={{ color: V.text, transform: 'translateY(-100%)' }}>{d.value > 0 ? fmt(d.value) : ''}</span>
              <div className="flex flex-col-reverse gap-[4px] items-center">
                {Array.from({ length: linhas }, (_, i) => (
                  <span key={i} className="w-[5px] h-[5px] rounded-full"
                        style={{ background: i < n ? color : 'rgba(22,24,28,0.07)', opacity: i < n ? 0.55 + 0.45 * (i / Math.max(1, n)) : 1 }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {data.map(d => <span key={d.label} className="flex-1 text-center text-[11px] capitalize" style={{ color: V.subtle }}>{d.label}</span>)}
      </div>
    </div>
  );
}

/** Anel de pontinhos com o valor no centro (ex.: saúde 0–100). */
export function DotRing({ value, label, size = 180 }: { value: number; label?: string; size?: number }) {
  const n = 48;
  const on = Math.round((Math.max(0, Math.min(100, value)) / 100) * n);
  const r = size / 2 - 10;
  const cor = value >= 80 ? V.ok : value >= 60 ? V.warn : V.brand;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? 'Valor'}: ${value}%`}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={size / 2 + r * Math.cos(a)} cy={size / 2 + r * Math.sin(a)} r={i < on ? 3.2 : 2.4}
                       fill={i < on ? cor : 'rgba(22,24,28,0.1)'} />;
      })}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.2} fontWeight={500} fill={V.text}
            fontFamily="var(--font)">{value}<tspan fontSize={size * 0.09} dx="2">%</tspan></text>
      {label && <text x="50%" y={size / 2 + size * 0.17} textAnchor="middle" fontSize={11} fill={V.muted} fontFamily="var(--font)">{label}</text>}
    </svg>
  );
}

/** Título de seção de card (com ação opcional à direita). */
export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[16px] font-medium leading-tight" style={{ color: V.text }}>{title}</h3>
        {subtitle && <p className="text-[12px] mt-1" style={{ color: V.subtle }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
