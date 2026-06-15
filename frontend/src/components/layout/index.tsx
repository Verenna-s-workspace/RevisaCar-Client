import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Car, CalendarPlus, Clock, FileText, Bell, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth';
import { Avatar } from '../ui';

/* ─── Logo ──────────────────────────────────────────────── */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="w-8 h-8 bg-brand rounded-[10px] flex items-center justify-center shadow-sm shadow-brand/30">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="12" rx="2"/>
          <path d="M16 8h4l3 3v4h-7V8z"/>
          <circle cx="5.5" cy="17.5" r="2.5"/>
          <circle cx="18.5" cy="17.5" r="2.5"/>
        </svg>
      </div>
      <span className="font-logo text-[1.18rem] font-semibold text-text leading-none tracking-tight">
        Revisa<span className="text-brand">car</span>
      </span>
    </div>
  );
}

/* ─── Notification bell ─────────────────────────────────── */
function NotifBell({ count = 0 }: { count?: number }) {
  return (
    <NavLink
      to="/notificacoes"
      className="relative w-9 h-9 flex items-center justify-center rounded-xl text-text-muted
                 hover:bg-surface-3 hover:text-text-2 transition-colors"
    >
      <Bell size={19} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-brand text-white text-[0.6rem]
                         font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  );
}

/* ─── Topbar ────────────────────────────────────────────── */
interface TopbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  notifCount?: number;
}

export function Topbar({ title, showBack, onBack, right, notifCount = 0 }: TopbarProps) {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  if (!title) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border
                         px-4 h-[60px] flex items-center justify-between"
              style={{ boxShadow: '0 1px 0 var(--border)' }}>
        <Logo />
        <div className="flex items-center gap-1">
          <NotifBell count={notifCount} />
          <NavLink to="/perfil" className="ml-1">
            <Avatar name={session?.name || 'U'} size={33} />
          </NavLink>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border
                       h-[60px] flex items-center px-2"
            style={{ boxShadow: '0 1px 0 var(--border)' }}>
      <button
        onClick={onBack || (() => navigate(-1))}
        className={clsx(
          'w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:bg-surface-3 hover:text-text transition-colors',
          !showBack && 'invisible pointer-events-none'
        )}
      >
        <ChevronLeft size={22} />
      </button>
      <span className="font-bold text-base text-text absolute left-1/2 -translate-x-1/2 max-w-[56%] truncate">
        {title}
      </span>
      <div className="ml-auto w-10 h-10 flex items-center justify-center">{right}</div>
    </header>
  );
}

/* ─── Bottom Nav ────────────────────────────────────────── */
const NAV = [
  { to: '/',           icon: Home,     label: 'Início'     },
  { to: '/veiculos',   icon: Car,      label: 'Veículos'   },
  { to: '/agendar',    icon: null,     label: '',   fab: true },
  { to: '/historico',  icon: Clock,    label: 'Histórico'  },
  { to: '/orcamentos', icon: FileText, label: 'Orçamentos' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-md
                 border-t border-border flex items-center justify-around px-1 z-50"
      style={{
        height: 'var(--nav-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -1px 0 var(--border), 0 -8px 24px rgba(0,0,0,0.05)',
      }}
    >
      {NAV.map(({ to, icon: Icon, label, fab }) => {
        const active = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to);

        if (fab) {
          return (
            <NavLink
              key={to}
              to={to}
              className="w-[52px] h-[52px] bg-brand rounded-[16px] flex items-center justify-center
                         mb-2 shadow-brand transition-all duration-200 active:scale-90 hover:bg-brand-dark"
            >
              <CalendarPlus size={23} color="white" strokeWidth={2.3} />
            </NavLink>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl min-w-[52px] transition-all duration-200 relative"
          >
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 rounded-xl bg-crit-bg"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            {Icon && (
              <Icon
                size={21}
                className={clsx('relative z-10 transition-colors', active ? 'text-brand' : 'text-text-subtle')}
                strokeWidth={active ? 2.4 : 1.9}
              />
            )}
            <span className={clsx(
              'text-2xs font-bold relative z-10 transition-colors',
              active ? 'text-brand' : 'text-text-subtle'
            )}>
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

export function MainLayout({ children, topbar }: { children: ReactNode; topbar?: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-[430px] mx-auto relative">
      {topbar}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 overflow-y-auto pb-safe"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}

/* ─── Auth Layout ───────────────────────────────────────── */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-[430px] mx-auto">
      {children}
    </div>
  );
}

/* ─── Bottom Sheet ──────────────────────────────────────── */
export function BottomSheet({ children, onClose, title }: {
  children: ReactNode; onClose: () => void; title?: string;
}) {
  // Lock body scroll
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
        className="relative bg-white rounded-t-[28px] w-full max-w-[430px] max-h-[92dvh] overflow-y-auto z-10"
      >
        {/* Handle */}
        <div className="sticky top-0 bg-white pt-3 pb-2 rounded-t-[28px] z-10">
          <div className="w-10 h-1 bg-border-md rounded-full mx-auto" />
          {title && (
            <div className="px-5 pt-4 pb-1">
              <h2 className="font-bold text-lg text-text">{title}</h2>
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
