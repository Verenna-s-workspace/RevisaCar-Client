import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Car, ChevronLeft, FileText, User, WifiOff, Bell, Store,
  Receipt, FolderOpen, QrCode, Wrench, Settings, LogOut,
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
const BRAND = '#CC1400';

/* ─── Notificações não lidas (mesmo cache do Início) ────── */
function useNaoLidas() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });
  return data?.unread_notifications_count ?? 0;
}

const iniciais = (nome?: string) =>
  (nome ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/logo.svg" alt="" width={28} height={28} className="flex-none" />
      {!compact && (
        <span className="text-[20px] leading-none font-semibold" style={{ fontFamily: 'var(--font-logo)', color: 'var(--text)' }}>
          RevisaCar
        </span>
      )}
    </span>
  );
}

export function Avatar() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  return (
    <button onClick={() => navigate('/perfil')} aria-label="Meu perfil" title="Meu perfil"
      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white flex-none"
      style={{ background: 'linear-gradient(140deg, #E2483B, #A31000)', boxShadow: '0 0 0 3px rgba(255,255,255,0.9)' }}>
      {iniciais(session?.name)}
    </button>
  );
}

/* ─── Topbar (cabeçalho das páginas) ────────────────────── */
interface TopbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

// Páginas que já estão no menu do topo: no desktop não precisam de "voltar".
const RAIZES_DESKTOP = new Set(['/', '/veiculo', '/historico', '/manutencoes', '/orcamentos', '/oficinas',
  '/documentos', '/qr', '/qr-code', '/notificacoes', '/ajustes', '/perfil', '/agendar']);

export function Topbar({ title, showBack, onBack, right }: TopbarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const raiz = RAIZES_DESKTOP.has(pathname);

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 h-[var(--topbar-h)]
                 bg-[rgba(243,241,238,0.82)] backdrop-blur-xl
                 lg:static lg:bg-transparent lg:backdrop-blur-0 lg:h-auto lg:px-4 lg:pt-6 lg:pb-3"
      style={{ fontFamily: 'var(--font)' }}
    >
      {showBack && (
        <button
          aria-label="Voltar"
          onClick={onBack || (() => navigate(-1))}
          className={clsx('chip w-10 h-10 rounded-full flex items-center justify-center flex-none', raiz && 'lg:hidden')}
          style={{ color: BRAND }}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
      )}
      <h1 className="flex-1 min-w-0 truncate text-[18px] font-medium lg:text-[28px] lg:font-normal"
          style={{ color: 'var(--text)' }}>
        {title}
      </h1>
      {right && <div className="flex-none flex items-center gap-2">{right}</div>}
    </header>
  );
}

/* ─── Menu flutuante (celular) ──────────────────────────── */
// Cinco botões redondos numa pílula de vidro; o da página atual sobe e fica vermelho.
const NAV = [
  { to: '/veiculo',      icon: Car,      label: 'Veículos' },
  { to: '/manutencoes',  icon: Wrench,   label: 'Manutenções' },
  { to: '/',             icon: Home,     label: 'Início' },
  { to: '/notificacoes', icon: Bell,     label: 'Notificações' },
  { to: '/historico',    icon: FileText, label: 'Serviços' },
];

const ativo = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`) || (to === '/veiculo' && pathname.startsWith('/veiculos'));

export function BottomNav() {
  const location = useLocation();
  const naoLidas = useNaoLidas();

  return (
    <nav
      aria-label="Menu principal"
      className="fixed left-1/2 -translate-x-1/2 z-50 lg:hidden"
      style={{ bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="glass rounded-full flex items-center gap-2 px-2.5 py-2">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = ativo(location.pathname, to);
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative rounded-full flex items-center justify-center transition-all duration-200',
                active ? 'nav-raised w-[58px] h-[58px] -translate-y-4' : 'chip w-12 h-12',
              )}
            >
              <Icon size={active ? 22 : 19} strokeWidth={active ? 2.1 : 1.7} color={active ? '#fff' : '#3A3D44'} />
              {to === '/notificacoes' && naoLidas > 0 && !active && (
                <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full" style={{ background: BRAND, boxShadow: '0 0 0 2px #fff' }} />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Menu no topo (desktop) ────────────────────────────── */
const NAV_TOPO = [
  { to: '/',            icon: Home,       label: 'Início' },
  { to: '/veiculo',     icon: Car,        label: 'Veículos' },
  { to: '/manutencoes', icon: Wrench,     label: 'Manutenções' },
  { to: '/historico',   icon: FileText,   label: 'Serviços' },
  { to: '/orcamentos',  icon: Receipt,    label: 'Orçamentos' },
  { to: '/documentos',  icon: FolderOpen, label: 'Documentos' },
  { to: '/oficinas',    icon: Store,      label: 'Oficinas' },
];

export function TopNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const naoLidas = useNaoLidas();
  const { clearSession } = useAuthStore();
  const [menu, setMenu] = useState(false);

  return (
    <header className="hidden lg:flex items-center gap-6 h-[76px] px-8 flex-none">
      <button onClick={() => navigate('/')} aria-label="Início" className="flex-none"><Logo /></button>

      <nav aria-label="Menu principal" className="flex-1 flex justify-center">
        <div className="glass rounded-full flex items-center gap-1 p-1.5">
          {NAV_TOPO.map(({ to, icon: Icon, label }) => {
            const active = ativo(pathname, to);
            return (
              <NavLink key={to} to={to} title={label} aria-current={active ? 'page' : undefined}
                className={clsx('group flex items-center gap-2 h-10 rounded-full transition-all',
                  active ? 'px-4 text-white' : 'w-10 justify-center hover:bg-white')}
                style={active ? { background: BRAND } : { color: '#3A3D44' }}>
                <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
                <span className={clsx('text-[13px] font-medium', !active && 'sr-only')}>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="flex items-center gap-2.5 flex-none relative">
        <button onClick={() => navigate('/notificacoes')} aria-label={naoLidas ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
          className="chip relative w-10 h-10 rounded-full flex items-center justify-center">
          <Bell size={18} strokeWidth={1.8} />
          {naoLidas > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full" style={{ background: BRAND, boxShadow: '0 0 0 2px #fff' }} />}
        </button>
        <button onClick={() => setMenu(m => !m)} aria-label="Conta" aria-expanded={menu}
          className="w-10 h-10 rounded-full"><span className="pointer-events-none"><AvatarEstatico /></span></button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="glass absolute right-0 top-12 z-50 w-52 rounded-2xl p-1.5 flex flex-col">
              {[
                { icon: User, label: 'Meu perfil', to: '/perfil' },
                { icon: Settings, label: 'Ajustes', to: '/ajustes' },
                { icon: QrCode, label: 'QR do veículo', to: '/qr' },
              ].map(i => (
                <button key={i.to} onClick={() => { setMenu(false); navigate(i.to); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] text-left hover:bg-white">
                  <i.icon size={16} color="#7A7F87" /> {i.label}
                </button>
              ))}
              <button onClick={() => { setMenu(false); clearSession(); navigate('/login', { replace: true }); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] text-left hover:bg-white" style={{ color: BRAND }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function AvatarEstatico() {
  const { session } = useAuthStore();
  return (
    <span className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(140deg, #E2483B, #A31000)', boxShadow: '0 0 0 3px rgba(255,255,255,0.9)' }}>
      {iniciais(session?.name)}
    </span>
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
 * No desktop o cabeçalho da página fica dentro da coluna de conteúdo.
 */
export function MainLayout({ children, topbar, showNav = true, width = 'narrow' }: {
  children: ReactNode; topbar?: ReactNode; showNav?: boolean; width?: 'narrow' | 'wide';
}) {
  const location = useLocation();
  const desktop = useIsDesktop();
  const largura = width === 'wide' ? 'lg:max-w-[1200px]' : 'lg:max-w-[780px]';

  return (
    <div className="h-[100dvh] flex flex-col w-full max-w-[430px] mx-auto relative overflow-hidden lg:max-w-none lg:mx-0">
      <TopNav />
      <OfflineBanner />
      {!desktop && topbar}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={clsx('flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:pb-12', showNav ? 'pb-safe' : 'pb-8')}
        >
          <div className={clsx('w-full lg:mx-auto lg:px-4', largura)}>
            {desktop && topbar}
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
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
