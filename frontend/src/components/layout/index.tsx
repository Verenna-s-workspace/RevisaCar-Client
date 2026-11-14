import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Car, ChevronLeft, FileText, Clock, User, WifiOff, Bell, Store,
  Receipt, FolderOpen, QrCode, Wrench, Settings, LogOut, CalendarPlus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth';
import { dashboardApi } from '../../services/api';

/* ─── Breakpoint desktop ────────────────────────────────── */
// Abaixo de 1024px o app é o PWA de celular de sempre; acima, ganha sidebar,
// cabeçalho largo e modais centrados (mesma linguagem do app da oficina).
const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP_QUERY);
    if (!mq) return;
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

/* ─── Offline banner ────────────────────────────── */
function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[12px] font-semibold text-white"
         style={{ background: '#14161A' }}>
      <WifiOff size={14} /> Sem conexão · seu passe continua disponível offline
    </div>
  );
}

/* ─── Design tokens ─────────────────────────────────────── */
const BRAND  = '#CC1400';
const ACTIVE = BRAND;
const IDLE   = '#9AA0A8';

/* ─── Topbar ────────────────────────────────────────────── */
interface TopbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

// Páginas que já estão na sidebar: no desktop não precisam de "voltar".
const RAIZES_DESKTOP = new Set(['/', '/veiculo', '/historico', '/manutencoes', '/orcamentos', '/oficinas',
  '/documentos', '/qr', '/qr-code', '/notificacoes', '/ajustes', '/perfil', '/agendar']);

export function Topbar({ title, showBack, onBack, right }: TopbarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const raiz = RAIZES_DESKTOP.has(pathname);

  return (
    <header
      className="sticky top-0 z-40 border-b flex items-center px-2 h-[var(--topbar-h)] bg-[var(--bg)]
                 lg:px-8 lg:h-[72px] lg:bg-white"
      style={{ borderColor: 'var(--border)', fontFamily: 'var(--font)' }}
    >
      <button
        aria-label="Voltar"
        onClick={onBack || (() => navigate(-1))}
        className={clsx(
          'w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-black/[0.04]',
          !showBack && 'invisible pointer-events-none lg:hidden',
          showBack && (raiz ? 'lg:hidden' : 'lg:mr-2'),
        )}
        style={{ color: 'var(--text)' }}
      >
        <ChevronLeft size={22} strokeWidth={2} />
      </button>
      <h1
        className="font-semibold text-[15px] absolute left-1/2 -translate-x-1/2 max-w-[56%] truncate
                   lg:static lg:translate-x-0 lg:max-w-none lg:text-[22px] lg:font-bold"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </h1>
      <div className="ml-auto min-w-10 h-10 flex items-center justify-center">{right}</div>
    </header>
  );
}

/* ─── Bottom Nav (celular) ──────────────────────────────── */
const NAV = [
  { to: '/',          icon: Home,     label: 'Início'  },
  { to: '/historico', icon: FileText, label: 'Serviços'},
  { to: '/agendar',   icon: Clock,    label: 'Agendar' },
  { to: '/veiculo',   icon: Car,      label: 'Veículo' },
  { to: '/perfil',    icon: User,     label: 'Perfil'  },
];

const ativo = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`) || (to === '/veiculo' && pathname.startsWith('/veiculos'));

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Menu principal"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex items-center justify-around px-1 z-50 lg:hidden"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid var(--border)',
        height: 'var(--nav-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV.map(({ to, icon: Icon, label }) => {
        const active = ativo(location.pathname, to);
        return (
          <NavLink
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-[3px] py-2 flex-1 min-w-0"
          >
            <Icon size={21} strokeWidth={active ? 2.2 : 1.7} color={active ? ACTIVE : IDLE} />
            <span className="text-[10px] font-semibold" style={{ color: active ? ACTIVE : IDLE, fontFamily: 'var(--font)' }}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ─── Sidebar (desktop) ─────────────────────────────────── */
// Mesma estrutura do app da oficina: marca, ação principal, grupos nomeados e,
// no rodapé, quem está logado + Sair.
const NAV_GRUPOS: { titulo: string; itens: { to: string; icon: typeof Home; label: string }[] }[] = [
  { titulo: 'Principal', itens: [
    { to: '/',            icon: Home,      label: 'Início' },
    { to: '/veiculo',     icon: Car,       label: 'Meus veículos' },
    { to: '/historico',   icon: FileText,  label: 'Serviços' },
    { to: '/manutencoes', icon: Wrench,    label: 'Manutenções' },
  ] },
  { titulo: 'Oficina', itens: [
    { to: '/orcamentos',  icon: Receipt,   label: 'Orçamentos' },
    { to: '/oficinas',    icon: Store,     label: 'Minhas oficinas' },
  ] },
  { titulo: 'Carteira', itens: [
    { to: '/documentos',  icon: FolderOpen, label: 'Documentos' },
    { to: '/qr',          icon: QrCode,     label: 'QR do veículo' },
  ] },
];

const iniciais = (nome?: string) =>
  (nome ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';

function SidebarLink({ to, icon: Icon, label, badge }: { to: string; icon: typeof Home; label: string; badge?: number }) {
  const { pathname } = useLocation();
  const active = ativo(pathname, to);
  return (
    <NavLink
      to={to}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors',
        active ? 'bg-[var(--crit-bg)] text-[var(--brand)]' : 'text-[var(--text-2)] hover:bg-black/[0.04]',
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {!!badge && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
              style={{ background: BRAND }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { session, clearSession } = useAuthStore();
  // Mesmo cache do Início: o contador de não lidas não gera request extra.
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });
  const naoLidas = dash?.unread_notifications_count ?? 0;

  const sair = () => { clearSession(); navigate('/login', { replace: true }); };

  return (
    <aside
      className="hidden lg:flex w-[248px] flex-none h-[100dvh] sticky top-0 flex-col border-r overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-6">
        <img src="/logo.svg" alt="" width={40} height={40} className="flex-none" />
        <div className="min-w-0">
          <p className="text-[19px] leading-none font-semibold" style={{ fontFamily: 'var(--font-logo)', color: 'var(--text)' }}>RevisaCar</p>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--muted)' }}>Área do cliente</p>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={() => navigate('/agendar')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
          style={{ background: BRAND, boxShadow: '0 1px 2px rgba(204,20,0,0.25)' }}
        >
          <CalendarPlus size={17} /> Agendar serviço
        </button>
      </div>

      <nav aria-label="Menu principal" className="flex-1 px-3 pt-5 flex flex-col gap-5">
        {NAV_GRUPOS.map(g => (
          <div key={g.titulo}>
            <p className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>{g.titulo}</p>
            <div className="flex flex-col gap-0.5">
              {g.itens.map(it => <SidebarLink key={it.to} {...it} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-4 flex flex-col gap-0.5 border-t mt-4" style={{ borderColor: 'var(--border)' }}>
        <SidebarLink to="/notificacoes" icon={Bell} label="Notificações" badge={naoLidas} />
        <SidebarLink to="/ajustes" icon={Settings} label="Ajustes" />
        <div className="flex items-center gap-3 px-3 pt-3 mt-2">
          <button onClick={() => navigate('/perfil')} aria-label="Meu perfil"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-none"
            style={{ background: BRAND }}>
            {iniciais(session?.name)}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{session?.name || 'Minha conta'}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>{session?.email}</p>
          </div>
          <button onClick={sair} aria-label="Sair da conta" title="Sair"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.05]">
            <LogOut size={16} color="var(--muted)" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Main Layout ───────────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

/**
 * `width` só vale no desktop: "narrow" (formulários, configurações) ou "wide"
 * (listas em grade, painel). No celular o conteúdo ocupa a tela toda.
 */
export function MainLayout({ children, topbar, showNav = true, width = 'narrow' }: {
  children: ReactNode; topbar?: ReactNode; showNav?: boolean; width?: 'narrow' | 'wide';
}) {
  const location = useLocation();

  return (
    <div className="h-[100dvh] flex w-full max-w-[430px] mx-auto relative overflow-hidden lg:max-w-none lg:mx-0"
         style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <OfflineBanner />
        {topbar}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={clsx('flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:pb-10', showNav ? 'pb-safe' : 'pb-8')}
          >
            <div className={clsx('w-full lg:mx-auto lg:px-4 lg:pt-4', width === 'wide' ? 'lg:max-w-[1120px]' : 'lg:max-w-[760px]')}>
              {children}
            </div>
          </motion.main>
        </AnimatePresence>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

/* ─── Auth Layout ───────────────────────────────────────── */
// Desktop: painel da marca à esquerda e o formulário à direita.
export function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-1 flex-col justify-between p-12 text-white relative overflow-hidden"
         style={{ background: 'linear-gradient(150deg, #CC1400 0%, #8F0E00 70%, #5E0900 100%)' }}>
      <div aria-hidden className="absolute -right-24 -bottom-24 w-[420px] h-[420px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div aria-hidden className="absolute -left-16 top-1/3 w-[220px] h-[220px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center">
          <img src="/logo.svg" alt="" width={30} height={30} />
        </div>
        <span className="text-[24px] font-semibold" style={{ fontFamily: 'var(--font-logo)' }}>RevisaCar</span>
      </div>
      <div className="relative max-w-[440px]">
        <h2 className="text-[34px] leading-tight font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
          Seu carro em dia, sem planilha nem papelada.
        </h2>
        <ul className="mt-6 flex flex-col gap-3 text-[15px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
          <li>• Agende com a sua oficina em poucos cliques</li>
          <li>• Receba os orçamentos com cada item detalhado</li>
          <li>• Histórico, lembretes e documentos do veículo num só lugar</li>
        </ul>
      </div>
      <p className="relative text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>RevisaCar · Verenna Digital</p>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full" style={{ background: 'var(--bg)' }}>
      <BrandPanel />
      <div className="flex-1 lg:flex-none lg:w-[520px] flex flex-col lg:justify-center overflow-x-hidden">
        <div className="w-full max-w-[430px] mx-auto flex flex-col">{children}</div>
      </div>
    </div>
  );
}

/* ─── Bottom Sheet (celular) / Modal (desktop) ──────────── */
export function BottomSheet({ children, onClose, title }: {
  children: ReactNode; onClose: () => void; title?: string;
}) {
  const desktop = useIsDesktop();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
  }, [onClose]);

  return (
    <div className={clsx('fixed inset-0 z-50 flex justify-center', desktop ? 'items-center p-6' : 'items-end')} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
        transition={desktop ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] } : { type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className={clsx(
          'relative w-full overflow-y-auto z-10',
          desktop ? 'max-w-[520px] max-h-[86dvh] rounded-[24px] shadow-2xl' : 'max-w-[430px] max-h-[92dvh] rounded-t-[28px]',
        )}
        style={{ background: '#FFFFFF' }}
      >
        <div className={clsx('sticky top-0 pb-2 z-10', desktop ? 'pt-2 rounded-t-[24px]' : 'pt-3 rounded-t-[28px]')} style={{ background: '#FFFFFF' }}>
          {!desktop && <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border-md)' }} />}
          {title && (
            <div className="px-5 pt-4 pb-1">
              <h2 className="font-bold text-lg" style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{title}</h2>
            </div>
          )}
        </div>
        <div className={clsx('px-5', desktop ? 'pb-6' : 'pb-10')}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
