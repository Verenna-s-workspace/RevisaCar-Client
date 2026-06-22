import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import type { Urgency, EstimateStatus, AppointmentStatus } from '../../types';

/* ═══════════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════════ */
type BadgeVariant = 'ok' | 'warn' | 'crit' | 'info' | 'neutral' | 'brand';

const BADGE: Record<BadgeVariant, string> = {
  ok:      'bg-ok-bg text-ok border-ok-border',
  warn:    'bg-warn-bg text-warn border-warn-border',
  crit:    'bg-crit-bg text-crit border-crit-border',
  info:    'bg-info-bg text-info border-info-border',
  neutral: 'bg-surface-3 text-text-muted border-border',
  brand:   'bg-crit-bg text-brand border-crit-border',
};

export function Badge({ variant = 'neutral', children, className }: {
  variant?: BadgeVariant; children: ReactNode; className?: string;
}) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-2xs font-bold tracking-wide border whitespace-nowrap',
      BADGE[variant], className
    )}>
      {children}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const cfg: Record<Urgency, { v: BadgeVariant; l: string; dot: string }> = {
    ok:      { v:'ok',   l:'Em dia',  dot:'bg-ok-mid'   },
    atencao: { v:'warn', l:'Atenção', dot:'bg-warn-mid'  },
    urgente: { v:'crit', l:'Urgente', dot:'bg-brand'     },
  };
  const { v, l, dot } = cfg[urgency];
  return (
    <Badge variant={v}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {l}
    </Badge>
  );
}

export function EstimateBadge({ status }: { status: EstimateStatus }) {
  const cfg: Record<EstimateStatus, { v: BadgeVariant; l: string }> = {
    pendente:  { v:'warn',    l:'Pendente'  },
    aprovado:  { v:'ok',      l:'Aprovado'  },
    rejeitado: { v:'crit',    l:'Recusado'  },
    expirado:  { v:'neutral', l:'Expirado'  },
  };
  const { v, l } = cfg[status];
  return <Badge variant={v}>{l}</Badge>;
}

export function AppointmentBadge({ status }: { status: AppointmentStatus }) {
  const cfg: Record<AppointmentStatus, { v: BadgeVariant; l: string }> = {
    pendente:  { v:'warn',    l:'Aguardando' },
    confirmado:{ v:'ok',      l:'Confirmado' },
    rejeitado: { v:'crit',    l:'Rejeitado'  },
    concluido: { v:'info',    l:'Concluído'  },
    cancelado: { v:'neutral', l:'Cancelado'  },
  };
  const { v, l } = cfg[status];
  return <Badge variant={v}>{l}</Badge>;
}

/* ═══════════════════════════════════════════════
   BUTTON
   ═══════════════════════════════════════════════ */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const BTN_V: Record<string, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm hover:shadow-brand/25 active:bg-brand-deep',
  ghost:   'bg-surface-3 text-text-muted border border-border hover:border-border-md hover:text-text-2 hover:bg-surface-2',
  danger:  'bg-crit-bg text-crit border border-crit-border hover:bg-crit/10',
  success: 'bg-ok text-white hover:brightness-110',
  outline: 'bg-transparent text-brand border-2 border-brand hover:bg-crit-bg',
  subtle:  'bg-transparent text-text-3 hover:bg-surface-3 hover:text-text-2',
};
const BTN_S: Record<string, string> = {
  xs: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
  sm: 'px-3.5 py-2 text-sm rounded-lg gap-2',
  md: 'px-4 py-3 text-base rounded-xl gap-2',
  lg: 'px-5 py-3.5 text-base rounded-xl gap-2 font-bold tracking-tight',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant='primary', size='md', loading, fullWidth, icon, children, className, disabled, ...rest
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex items-center justify-center font-semibold transition-all duration-150',
      'disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.975]',
      'select-none focus-visible:outline-2 focus-visible:outline-brand',
      BTN_V[variant], BTN_S[size],
      fullWidth && 'w-full',
      className
    )}
    {...rest}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
    {children}
  </button>
));
Button.displayName = 'Button';

/* ═══════════════════════════════════════════════
   INPUT
   ═══════════════════════════════════════════════ */
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string; error?: string; hint?: string;
  prefix?: ReactNode; suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, prefix, suffix, className, id, ...rest
}, ref) => {
  const inputId = id || `f-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-2 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3.5 flex items-center text-text-subtle pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full border-[1.5px] rounded-xl font-sans text-sm text-text bg-surface transition-all duration-150',
            'placeholder:text-text-ghost outline-none',
            prefix ? 'pl-10 pr-4 py-3' : suffix ? 'pl-4 pr-10 py-3' : 'px-4 py-3',
            error
              ? 'border-crit focus:border-crit focus:shadow-[0_0_0_3px_rgba(204,20,0,0.12)]'
              : 'border-border focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,20,0,0.12)]',
            className
          )}
          {...rest}
        />
        {suffix && (
          <div className="absolute right-3.5 flex items-center text-text-subtle">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-crit font-medium animate-fade-up">{error}</p>}
      {hint && !error && <p className="text-xs text-text-subtle">{hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

/* ═══════════════════════════════════════════════
   SELECT
   ═══════════════════════════════════════════════ */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string;
  options: { value: string; label: string }[];
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, className, id, ...rest
}, ref) => {
  const selectId = id || `s-${label?.toLowerCase().replace(/\s+/g,'-')}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={selectId} className="text-xs font-semibold text-text-2 tracking-wide">{label}</label>}
      <select
        ref={ref} id={selectId}
        className={clsx(
          'w-full px-4 py-3 border-[1.5px] rounded-xl font-sans text-sm text-text bg-surface outline-none transition-all',
          error ? 'border-crit' : 'border-border focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,20,0,0.12)]',
          className
        )}
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-crit font-medium">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

/* ═══════════════════════════════════════════════
   TEXTAREA
   ═══════════════════════════════════════════════ */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, id, ...rest }, ref) => {
  const taId = id || `ta-${label?.toLowerCase().replace(/\s+/g,'-')}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={taId} className="text-xs font-semibold text-text-2 tracking-wide">{label}</label>}
      <textarea
        ref={ref} id={taId} rows={3}
        className={clsx(
          'w-full px-4 py-3 border-[1.5px] rounded-xl font-sans text-sm text-text bg-surface outline-none resize-none transition-all',
          error ? 'border-crit' : 'border-border focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,20,0,0.12)]',
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-crit font-medium">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

/* ═══════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════ */
export function Card({ children, className, onClick, padding = true }: {
  children: ReactNode; className?: string; onClick?: () => void; padding?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border border-border shadow-sm overflow-hidden',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform duration-100',
        padding && 'p-0',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-4 py-3.5 border-b border-border last:border-0', className)}>{children}</div>;
}

/* ═══════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════ */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
      <Skeleton className="h-5 w-3/5 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx('h-3.5 mb-2', i === lines - 1 ? 'w-2/5' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={i % 2 === 0 ? 2 : 3} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPINNER
   ═══════════════════════════════════════════════ */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={clsx('animate-spin', className)} />;
}

/* ═══════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════ */
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 px-6 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center text-text-subtle">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-bold text-base text-text-2">{title}</p>
        {description && <p className="text-sm text-text-subtle leading-relaxed max-w-[240px]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════ */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-text tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════ */
export function ProgressBar({ pct, color = 'var(--brand)' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DIVIDER
   ═══════════════════════════════════════════════ */
export function Divider({ className, label }: { className?: string; label?: string }) {
  if (label) return (
    <div className={clsx('flex items-center gap-3 text-text-subtle text-xs', className)}>
      <div className="flex-1 h-px bg-border" />
      {label}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
  return <div className={clsx('h-px bg-border', className)} />;
}

/* ═══════════════════════════════════════════════
   PLATE BADGE
   ═══════════════════════════════════════════════ */
export function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 border border-border-md rounded-lg text-xs font-bold text-text-2 tracking-widest tabular font-mono">
      <span className="text-blue-600">🔵</span>{plate}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   AVATAR
   ═══════════════════════════════════════════════ */
export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none', className)}
      style={{
        width: size, height: size,
        fontSize: size * 0.35,
        background: 'linear-gradient(135deg, #CC1400 0%, #8A0F00 100%)',
        boxShadow: '0 2px 8px rgba(204,20,0,0.25)',
      }}
    >
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STAT ROW
   ═══════════════════════════════════════════════ */
export function StatRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between py-3 border-b border-border last:border-0', className)}>
      <span className="text-sm text-text-3">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FILTER CHIPS
   ═══════════════════════════════════════════════ */
export function FilterChips<T extends string>({
  options, value, onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 font-sans',
            value === opt.value
              ? 'border-brand bg-crit-bg text-brand shadow-sm'
              : 'border-border bg-white text-text-muted hover:border-border-md hover:text-text-2'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   INFO BANNER
   ═══════════════════════════════════════════════ */
export function InfoBanner({ children, variant = 'info' }: {
  children: ReactNode;
  variant?: 'info' | 'warn' | 'ok' | 'crit';
}) {
  const cfg = {
    info: 'bg-info-bg border-info-border text-info',
    warn: 'bg-warn-bg border-warn-border text-warn',
    ok:   'bg-ok-bg border-ok-border text-ok',
    crit: 'bg-crit-bg border-crit-border text-crit',
  };
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border text-sm leading-relaxed', cfg[variant])}>
      {children}
    </div>
  );
}
