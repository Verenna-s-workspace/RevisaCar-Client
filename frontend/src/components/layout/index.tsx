import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Car, ChevronLeft, History, User, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

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

export function Topbar({ title, showBack, onBack, right }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-50 border-b flex items-center px-2"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
        height: 'var(--topbar-h)',
        fontFamily: 'var(--font)',
      }}
    >
      <button
        aria-label="Voltar"
        onClick={onBack || (() => navigate(-1))}
        className={clsx(
          'w-10 h-10 flex items-center justify-center rounded-xl transition-colors',
          !showBack && 'invisible pointer-events-none'
        )}
        style={{ color: 'var(--text)' }}
      >
        <ChevronLeft size={22} strokeWidth={2} />
      </button>
      <span
        className="font-semibold text-[15px] absolute left-1/2 -translate-x-1/2 max-w-[56%] truncate"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </span>
      <div className="ml-auto w-10 h-10 flex items-center justify-center">{right}</div>
    </header>
  );
}

/* ─── Bottom Nav — 4 items ──────────────────────────────── */
const NAV = [
  { to: '/',          icon: Home,    label: 'Início'   },
  { to: '/veiculo',   icon: Car,     label: 'Veículo'  },
  { to: '/historico', icon: History, label: 'Histórico'},
  { to: '/perfil',    icon: User,    label: 'Perfil'   },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex items-center justify-around px-1 z-50"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid var(--border)',
        height: 'var(--nav-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV.map(({ to, icon: Icon, label }) => {
        const active = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to);

        return (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center gap-[3px] py-2 px-4 min-w-[60px]"
          >
            <Icon
              size={21}
              strokeWidth={active ? 2.2 : 1.7}
              color={active ? ACTIVE : IDLE}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: active ? ACTIVE : IDLE, fontFamily: 'var(--font)' }}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ─── Main Layout ───────────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

export function MainLayout({ children, topbar, showNav = true }: {
  children: ReactNode; topbar?: ReactNode; showNav?: boolean;
}) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col w-full max-w-[430px] mx-auto relative overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <OfflineBanner />
      {topbar}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={showNav ? 'flex-1 overflow-y-auto overflow-x-hidden pb-safe' : 'flex-1 overflow-y-auto overflow-x-hidden pb-8'}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </div>
  );
}

/* ─── Auth Layout ───────────────────────────────────────── */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full max-w-[430px] mx-auto overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      {children}
    </div>
  );
}

/* ─── Bottom Sheet ──────────────────────────────────────── */
export function BottomSheet({ children, onClose, title }: {
  children: ReactNode; onClose: () => void; title?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="relative rounded-t-[28px] w-full max-w-[430px] max-h-[92dvh] overflow-y-auto z-10"
        style={{ background: '#FFFFFF' }}
      >
        <div className="sticky top-0 pt-3 pb-2 rounded-t-[28px] z-10" style={{ background: '#FFFFFF' }}>
          <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border-md)' }} />
          {title && (
            <div className="px-5 pt-4 pb-1">
              <h2 className="font-bold text-lg" style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{title}</h2>
            </div>
          )}
        </div>
        <div className="px-5 pb-10">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
