import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export { CarIllustration } from './CarIllustration';
export { SwipeRow } from './SwipeRow';

/*
 * Linguagem visual no estilo Apple: fundo agrupado neutro, cards sólidos,
 * tipografia do sistema com escala fixa (classes .t-*), cores semânticas com
 * modo escuro (tokens em index.css) e um só acento de ação — o vermelho da marca.
 */
export const V = {
  brand: 'var(--tint)',
  brandSoft: 'var(--tint-soft)',
  text: 'var(--text)',
  muted: 'var(--text-2)',
  subtle: 'var(--text-3)',
  line: 'var(--sep)',
  tile: 'var(--card-2)',
  ok: 'var(--green)',
  okSoft: 'var(--green-soft)',
  warn: 'var(--orange)',
  warnSoft: 'var(--orange-soft)',
  red: 'var(--red)',
  redSoft: 'var(--red-soft)',
};

/** Card sólido padrão (o nome ficou por compatibilidade). */
export function Glass({ children, className, as: Tag = 'div', onClick }: {
  children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'button'; onClick?: () => void;
}) {
  return (
    <Tag onClick={onClick} className={clsx('glass rounded-2xl', onClick && 'text-left press-card', className)}>
      {children}
    </Tag>
  );
}

/** Bloco de métrica (ex.: "Freios · 92%"). */
export function StatTile({ label, value, icon, hint, className }: {
  label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; className?: string;
}) {
  return (
    <div className={clsx('rounded-xl p-3 flex flex-col gap-1 min-w-0', className)}
         style={className?.includes('glass') ? undefined : { background: V.tile }}>
      {icon && <span style={{ color: V.brand }}>{icon}</span>}
      <span className="t-footnote leading-tight truncate" style={{ color: V.muted }}>{label}</span>
      <span className="t-title3 tabular" style={{ color: V.text }}>{value}</span>
      {hint}
    </div>
  );
}

/** Botão em pílula "cinza preenchido" do iOS; `active` = preenchido na cor de ação. */
export function Chip({ children, onClick, icon, active }: {
  children?: ReactNode; onClick?: () => void; icon?: ReactNode; active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('chip flex-none inline-flex items-center gap-1.5 h-9 rounded-full t-subhead font-semibold whitespace-nowrap',
        children ? 'px-3.5' : 'w-9 justify-center', active && 'chip-active')}
      style={active ? undefined : { color: 'var(--tint)' }}>
      {icon}{children}
    </button>
  );
}

/** Botão de ícone do cabeçalho: só o símbolo, na cor de ação, alvo de 44 pt. */
export function IconCircle({ children, onClick, label, className }: {
  children: ReactNode; onClick?: () => void; label: string; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={clsx('w-11 h-11 rounded-full flex items-center justify-center flex-none active:opacity-50', className)}
      style={{ color: 'var(--tint)' }}>
      {children}
    </button>
  );
}

/** Selo de prioridade: cor semântica + símbolo + texto (nunca só cor). */
export function PriorityBadge({ urgency }: { urgency: 'urgente' | 'atencao' | 'ok' | string }) {
  const st = urgency === 'urgente'
    ? { t: 'Urgente', bg: V.redSoft, c: V.red, s: '!' }
    : urgency === 'atencao' ? { t: 'Atenção', bg: V.warnSoft, c: V.warn, s: '●' } : { t: 'Em dia', bg: V.okSoft, c: V.ok, s: '✓' };
  return (
    <span className="t-caption font-semibold px-2 py-0.5 rounded-full flex-none inline-flex items-center gap-1" style={{ background: st.bg, color: st.c }}>
      <span aria-hidden>{st.s}</span>{st.t}
    </span>
  );
}

/** Barra de progresso fina e arredondada (0–100). */
export function DotProgress({ pct, color = V.brand }: { pct: number; color?: string; dots?: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full min-w-[60px] rounded-full overflow-hidden" style={{ background: 'var(--fill)' }} aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

/** Gráfico de barras (estilo app Saúde): colunas sólidas arredondadas, valor no hover. */
export function DotBars({ data, color = V.brand, height = 150, format }: {
  data: { label: string; value: number }[]; color?: string; height?: number; format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  const fmt = format ?? ((v: number) => v.toLocaleString('pt-BR'));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3" style={{ height }} role="img"
           aria-label={data.map(d => `${d.label}: ${fmt(d.value)}`).join('; ')}>
        {data.map(d => {
          const h = d.value > 0 ? Math.max(6, (d.value / max) * (height - 20)) : 4;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group">
              <span className="t-caption tabular mb-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: V.text }}>
                {d.value > 0 ? fmt(d.value) : ''}
              </span>
              <div className="w-full max-w-[28px] rounded-[6px]" style={{ height: h, background: d.value > 0 ? color : 'var(--fill)' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 mt-2">
        {data.map(d => <span key={d.label} className="flex-1 text-center t-caption capitalize" style={{ color: V.subtle }}>{d.label}</span>)}
      </div>
    </div>
  );
}

/** Anel de progresso (estilo anéis de Atividade) com o valor no centro. */
export function DotRing({ value, label, size = 180 }: { value: number; label?: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const esp = Math.max(10, size * 0.09);
  const r = size / 2 - esp / 2 - 2;
  const circ = 2 * Math.PI * r;
  const cor = v >= 80 ? V.ok : v >= 60 ? V.warn : V.red;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? 'Valor'}: ${v}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={esp} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round"
              strokeDasharray={`${(v / 100) * circ} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.22} fontWeight={700}
            fill="var(--text)" fontFamily="var(--font-heading)" letterSpacing="-0.02em">{v}<tspan fontSize={size * 0.1} dx="2">%</tspan></text>
      {label && <text x="50%" y={size / 2 + size * 0.18} textAnchor="middle" fontSize={12} fill="var(--text-2)" fontFamily="var(--font)">{label}</text>}
    </svg>
  );
}

/** Controle segmentado (iOS): trilho cinza, segmento ativo destacado. */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex p-[2px] rounded-[9px] w-full" style={{ background: 'var(--fill)' }}>
      {options.map(o => {
        const ativo = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={ativo} onClick={() => onChange(o.value)}
            className="flex-1 h-8 rounded-[7px] t-footnote font-semibold transition-all whitespace-nowrap px-2"
            style={ativo ? { background: 'var(--seg-active)', color: 'var(--text)', boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' }
                         : { color: 'var(--text)' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Título de seção de card (com ação opcional à direita). */
export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="t-title3" style={{ color: V.text }}>{title}</h3>
        {subtitle && <p className="t-footnote mt-0.5" style={{ color: V.subtle }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
