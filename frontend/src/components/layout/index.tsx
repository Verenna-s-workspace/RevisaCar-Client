import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { motion, useAnimationControls, useDragControls, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Car, ChevronLeft, FileText, User, WifiOff, Bell, Store, Receipt, FolderOpen, QrCode, Wrench,
  Settings, LogOut, CalendarPlus, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth';
import { dashboardApi } from '../../services/api';

/* ═══════════════════════════════════════════════════════════
   Layout no estilo Apple (HIG)
   - Celular: barra de abas com rótulos; título grande que encolhe para o
     cabeçalho translúcido; telas empilhadas (entram da direita, voltam pela
     esquerda); deslizar da borda esquerda volta; puxar para atualizar.
   - Computador/iPad: barra lateral com rótulos e grupos.
   - Folhas arrastáveis com projeção de momento; modal centrado no desktop.
   ═══════════════════════════════════════════════════════════ */

const DESKTOP_QUERY = '(min-width: 1024px)';
const REDUZIR = '(prefers-reduced-motion: reduce)';

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

const reduzMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUZIR).matches;

/** Molas da Apple: sem quique por padrão; quique leve só depois de um arremesso. */
const MOLA = { type: 'spring' as const, bounce: 0, duration: 0.38 };
const MOLA_ARREMESSO = { type: 'spring' as const, bounce: 0.18, duration: 0.4 };

/** Projeção de momento (mesma função do "Designing Fluid Interfaces"). */
function projetar(velocidade: number, desaceleracao = 0.998) {
  return ((velocidade / 1000) * desaceleracao) / (1 - desaceleracao);
}

/* ─── Offline ───────────────────────────────────────────── */
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
    <div role="status" className="flex items-center justify-center gap-2 py-2 text-[0.8125rem] font-medium"
         style={{ background: 'var(--text)', color: 'var(--card)' }}>
      <WifiOff size={14} /> Sem conexão · seu passe continua disponível offline
    </div>
  );
}

/* ─── Utilidades de identidade ──────────────────────────── */
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
      <img src="/logo.svg" alt="" width={26} height={26} className="flex-none" />
      {!compact && (
        <span className="text-[1.25rem] leading-none font-semibold" style={{ fontFamily: 'var(--font-logo)', color: 'var(--text)' }}>
          RevisaCar
        </span>
      )}
    </span>
  );
}

export function Avatar({ size = 32 }: { size?: number }) {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  return (
    <button onClick={() => navigate('/perfil')} aria-label="Minha conta" title="Minha conta"
      className="rounded-full flex items-center justify-center font-semibold text-white flex-none"
      style={{ width: size, height: size, fontSize: size * 0.4, background: 'linear-gradient(160deg, #8E8E93, #636366)' }}>
      {iniciais(session?.name)}
    </button>
  );
}

/** Sino de notificações (cabeçalho), com ponto quando há não lidas. */
export function SinoNotificacoes() {
  const navigate = useNavigate();
  const n = useNaoLidas();
  return (
    <button onClick={() => navigate('/notificacoes')} aria-label={n ? `Notificações (${n} não lidas)` : 'Notificações'}
      className="relative w-11 h-11 flex items-center justify-center rounded-full" style={{ color: 'var(--tint)' }}>
      <Bell size={21} strokeWidth={1.9} />
      {n > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--red)', boxShadow: '0 0 0 2px var(--bg)' }} />}
    </button>
  );
}

/* ─── Cabeçalho com título grande (Large Title) ─────────── */
interface TopbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  /** Texto do botão voltar (padrão: "Voltar"). */
  backLabel?: string;
  /** Linha de apoio abaixo do título grande. */
  subtitle?: ReactNode;
}

// Páginas que já estão nas abas/barra lateral: no computador não precisam de "voltar".
const RAIZES = new Set(['/', '/veiculo', '/historico', '/manutencoes', '/orcamentos', '/oficinas',
  '/documentos', '/qr', '/qr-code', '/notificacoes', '/ajustes', '/perfil', '/agendar']);

export function Topbar({ title, showBack, onBack, right, backLabel = 'Voltar', subtitle }: TopbarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const raiz = RAIZES.has(pathname);
  const sentinela = useRef<HTMLDivElement>(null);
  const [compacto, setCompacto] = useState(false);

  // Quando o título grande sai de vista, ele aparece pequeno no cabeçalho.
  useEffect(() => {
    const el = sentinela.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setCompacto(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <header
        className={clsx('sticky top-0 z-40 flex items-center h-[var(--topbar-h)] px-2 lg:px-4 transition-shadow',
          compacto ? 'material scroll-edge' : 'bg-transparent')}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', boxSizing: 'content-box' }}
      >
        <div className="flex-1 min-w-0 flex">
          {showBack && (
            <button aria-label="Voltar" onClick={onBack || (() => navigate(-1))}
              className={clsx('flex items-center h-11 pr-2 -ml-0.5 text-[1.0625rem] rounded-lg active:opacity-50', raiz && 'lg:hidden')}
              style={{ color: 'var(--tint)' }}>
              <ChevronLeft size={26} strokeWidth={2.2} className="-mr-0.5" />
              <span className="truncate max-w-[110px]">{backLabel}</span>
            </button>
          )}
        </div>
        <span aria-hidden className={clsx('t-headline truncate max-w-[50%] text-center transition-opacity duration-200', compacto ? 'opacity-100' : 'opacity-0')}
              style={{ color: 'var(--text)' }}>{title}</span>
        <div className="flex-1 min-w-0 flex justify-end items-center gap-1">{right}</div>
      </header>
      <div className="px-4 pt-1 pb-3">
        <h1 className="t-large" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <div className="t-subhead mt-1" style={{ color: 'var(--text-2)' }}>{subtitle}</div>}
        <div ref={sentinela} className="h-px" />
      </div>
    </>
  );
}

/* ─── Barra de abas (celular) ───────────────────────────── */
const ABAS = [
  { to: '/',            icon: Car,          label: 'Meu carro',  ativoEm: ['/', '/veiculo', '/veiculos', '/saude', '/qr'] },
  { to: '/manutencoes', icon: Wrench,       label: 'Manutenção', ativoEm: ['/manutencoes'] },
  { to: '/agendar',     icon: CalendarPlus, label: 'Agendar',    ativoEm: ['/agendar'] },
  { to: '/historico',   icon: FileText,     label: 'Serviços',   ativoEm: ['/historico', '/servico', '/garantia', '/orcamentos'] },
  { to: '/perfil',      icon: User,         label: 'Conta',      ativoEm: ['/perfil', '/ajustes', '/seguranca', '/privacidade', '/preferencias',
    '/oficinas', '/documentos', '/notificacoes', '/ajuda', '/termos', '/politica', '/excluir-conta'] },
];

const casa = (pathname: string, prefixos: string[]) =>
  prefixos.some(p => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));

export function BottomNav() {
  const { pathname } = useLocation();
  const naoLidas = useNaoLidas();
  return (
    <nav aria-label="Menu principal" className="material fixed bottom-0 inset-x-0 z-50 lg:hidden"
         style={{ boxShadow: '0 -0.5px 0 var(--sep)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-[430px] mx-auto grid grid-cols-5 h-[50px]">
        {ABAS.map(({ to, icon: Icon, label, ativoEm }) => {
          const ativo = casa(pathname, ativoEm);
          return (
            <NavLink key={to} to={to} aria-current={ativo ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-[2px] active:opacity-60"
              style={{ color: ativo ? 'var(--tint)' : 'var(--text-3)' }}>
              <Icon size={23} strokeWidth={ativo ? 2.2 : 1.8} />
              <span className="text-[0.625rem] font-medium leading-none">{label}</span>
              {to === '/perfil' && naoLidas > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Barra lateral (computador/iPad) ───────────────────── */
const GRUPOS: { titulo: string; itens: { to: string; icon: typeof Car; label: string }[] }[] = [
  { titulo: '', itens: [
    { to: '/',            icon: Car,          label: 'Meu carro' },
    { to: '/manutencoes', icon: Wrench,       label: 'Manutenção' },
    { to: '/agendar',     icon: CalendarPlus, label: 'Agendar' },
    { to: '/historico',   icon: FileText,     label: 'Serviços' },
  ] },
  { titulo: 'Oficina', itens: [
    { to: '/orcamentos', icon: Receipt, label: 'Orçamentos' },
    { to: '/oficinas',   icon: Store,   label: 'Minhas oficinas' },
  ] },
  { titulo: 'Carteira', itens: [
    { to: '/veiculo',    icon: Car,        label: 'Veículos' },
    { to: '/documentos', icon: FolderOpen, label: 'Documentos' },
    { to: '/qr',         icon: QrCode,     label: 'QR do veículo' },
  ] },
];

function ItemLateral({ to, icon: Icon, label, badge }: { to: string; icon: typeof Car; label: string; badge?: number }) {
  const { pathname } = useLocation();
  const ativo = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <NavLink to={to} aria-current={ativo ? 'page' : undefined}
      className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[0.9375rem] press-row"
      style={ativo ? { background: 'var(--tint-soft)', color: 'var(--tint)', fontWeight: 600 } : { color: 'var(--text)' }}>
      <Icon size={18} strokeWidth={ativo ? 2.2 : 1.8} style={{ color: 'var(--tint)' }} />
      <span className="flex-1 truncate">{label}</span>
      {!!badge && <span className="t-caption font-semibold px-1.5 rounded-full text-white" style={{ background: 'var(--red)' }}>{badge}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { session, clearSession } = useAuthStore();
  const naoLidas = useNaoLidas();
  return (
    <aside className="material hidden lg:flex w-[260px] flex-none h-[100dvh] sticky top-0 flex-col overflow-y-auto"
           style={{ boxShadow: '0.5px 0 0 var(--sep)' }}>
      <div className="px-5 pt-6 pb-4"><Logo /></div>
      <nav aria-label="Menu principal" className="flex-1 px-3 flex flex-col gap-5">
        {GRUPOS.map(g => (
          <div key={g.titulo || 'principal'} className="flex flex-col gap-0.5">
            {g.titulo && <p className="t-footnote font-semibold px-2.5 mb-1" style={{ color: 'var(--text-3)' }}>{g.titulo}</p>}
            {g.itens.map(i => <ItemLateral key={i.to} {...i} />)}
          </div>
        ))}
      </nav>
      <div className="px-3 pb-4 pt-3 flex flex-col gap-0.5" style={{ boxShadow: '0 -0.5px 0 var(--sep)' }}>
        <ItemLateral to="/notificacoes" icon={Bell} label="Notificações" badge={naoLidas} />
        <ItemLateral to="/ajustes" icon={Settings} label="Ajustes" />
        <div className="flex items-center gap-2.5 px-2.5 pt-3">
          <Avatar size={32} />
          <button onClick={() => navigate('/perfil')} className="flex-1 min-w-0 text-left">
            <p className="text-[0.875rem] font-semibold truncate" style={{ color: 'var(--text)' }}>{session?.name || 'Minha conta'}</p>
            <p className="t-caption truncate" style={{ color: 'var(--text-3)' }}>{session?.email}</p>
          </button>
          <button onClick={() => { clearSession(); navigate('/login', { replace: true }); }} aria-label="Sair da conta" title="Sair"
            className="w-9 h-9 rounded-lg flex items-center justify-center press-row" style={{ color: 'var(--text-2)' }}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Layout principal ──────────────────────────────────── */
/**
 * `width` só vale no computador: "narrow" (formulários) ou "wide" (painéis/listas).
 * O cabeçalho da página fica dentro da área que rola (título grande encolhe).
 */
export function MainLayout({ children, topbar, showNav = true, width = 'narrow' }: {
  children: ReactNode; topbar?: ReactNode; showNav?: boolean; width?: 'narrow' | 'wide';
}) {
  const { pathname } = useLocation();
  const tipo = useNavigationType(); // POP = voltar
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const qc = useQueryClient();
  const mainRef = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const drag = useDragControls();
  const largura = width === 'wide' ? 'lg:max-w-[1100px]' : 'lg:max-w-[720px]';

  // Pilha de navegação: nova tela entra da direita; ao voltar, da esquerda. Sem esperar a anterior sair.
  const entrada = reduzMovimento() ? { opacity: 0 } : tipo === 'POP' ? { x: -60, opacity: 0.6 } : { x: 80, opacity: 0.6 };

  // Deslizar da borda esquerda para voltar (só celular, só se houver para onde voltar).
  const podeVoltar = !desktop && !RAIZES.has(pathname) && typeof window !== 'undefined' && window.history.length > 1;
  const comecarBorda = (e: React.PointerEvent) => {
    if (podeVoltar && e.pointerType !== 'mouse' && e.clientX < 22) drag.start(e);
  };
  const soltar = (_: unknown, info: PanInfo) => {
    const larguraTela = window.innerWidth;
    const destino = info.offset.x + projetar(info.velocity.x);
    if (destino > larguraTela * 0.45) {
      animate(x, larguraTela, { ...MOLA, velocity: info.velocity.x }).then(() => { navigate(-1); x.set(0); });
    } else {
      animate(x, 0, { ...MOLA_ARREMESSO, velocity: info.velocity.x });
    }
  };

  // Puxar para atualizar (quando a lista está no topo).
  const [puxar, setPuxar] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicioY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    inicioY.current = mainRef.current && mainRef.current.scrollTop <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (inicioY.current == null || atualizando) return;
    const dy = e.touches[0].clientY - inicioY.current;
    // resistência elástica: quanto mais puxa, menos acompanha
    setPuxar(dy > 0 ? (dy * 0.55 * 300) / (300 + 0.55 * dy) : 0);
  };
  const onTouchEnd = useCallback(async () => {
    if (inicioY.current == null) return;
    inicioY.current = null;
    if (puxar > 64) {
      setAtualizando(true);
      setPuxar(48);
      await qc.refetchQueries({ type: 'active' });
      setAtualizando(false);
    }
    setPuxar(0);
  }, [puxar, qc]);

  return (
    <div className="h-[100dvh] flex w-full relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <OfflineBanner />
        <motion.main
          ref={mainRef}
          key={pathname}
          initial={entrada}
          animate={{ x: 0, opacity: 1 }}
          transition={MOLA}
          style={{ x }}
          drag={podeVoltar ? 'x' : false}
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 1 }}
          dragMomentum={false}
          onDragEnd={soltar}
          onPointerDown={comecarBorda}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={clsx('flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-[430px] mx-auto lg:max-w-none',
            showNav ? 'pb-[calc(var(--nav-h)+24px)] lg:pb-12' : 'pb-10')}
        >
          {(puxar > 0 || atualizando) && (
            <div className="flex justify-center items-end overflow-hidden" style={{ height: puxar }} aria-live="polite">
              <Loader2 size={20} className={clsx('mb-2', atualizando && 'animate-spin')}
                style={{ color: 'var(--text-3)', transform: atualizando ? undefined : `rotate(${puxar * 4}deg)`, opacity: Math.min(1, puxar / 64) }} />
              {atualizando && <span className="sr-only">Atualizando</span>}
            </div>
          )}
          <div className={clsx('w-full lg:mx-auto lg:px-6 lg:pt-4', largura)}>
            {topbar}
            {children}
          </div>
        </motion.main>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

/* ─── Login (computador: painel da marca + formulário) ──── */
export function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-1 flex-col justify-between p-12 text-white relative overflow-hidden"
         style={{ background: 'linear-gradient(160deg, #CC1400 0%, #8F0E00 75%, #5E0900 100%)' }}>
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-[12px] flex items-center justify-center" style={{ background: '#fff' }}>
          <img src="/logo.svg" alt="" width={30} height={30} />
        </div>
        <span className="text-[1.375rem] font-semibold" style={{ fontFamily: 'var(--font-logo)' }}>RevisaCar</span>
      </div>
      <div className="relative max-w-[460px]">
        <h2 className="t-large" style={{ fontSize: '2.75rem' }}>Seu carro em dia, sem planilha nem papelada.</h2>
        <ul className="mt-6 flex flex-col gap-3 t-body" style={{ color: 'rgba(255,255,255,0.9)' }}>
          <li>Agende com a sua oficina em poucos toques.</li>
          <li>Receba os orçamentos com cada item detalhado.</li>
          <li>Histórico, lembretes e documentos num só lugar.</li>
        </ul>
      </div>
      <p className="relative t-caption" style={{ color: 'rgba(255,255,255,0.7)' }}>RevisaCar · Verenna Digital</p>
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

/* ─── Folha (celular) / Modal (computador) ──────────────── */
// Celular: arraste pela alça/título — acompanha o dedo 1:1 e fecha usando a
// velocidade do gesto (projeção de momento). Mola sem quique; quique leve só
// quando volta depois de um arremesso. Computador: modal centrado; Esc fecha.
export function BottomSheet({ children, onClose, title }: {
  children: ReactNode; onClose: () => void; title?: string;
}) {
  const desktop = useIsDesktop();
  const y = useMotionValue(0);
  const controls = useAnimationControls();
  const dragCtl = useDragControls();
  const painel = useRef<HTMLDivElement>(null);
  const fechando = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const fechar = useCallback(async (velocidade = 0) => {
    if (fechando.current) return;
    fechando.current = true;
    const h = painel.current?.offsetHeight ?? 600;
    if (desktop) await controls.start({ opacity: 0, scale: 0.97, transition: { duration: 0.15 } });
    else await animate(y, h, { ...MOLA, velocity: velocidade });
    onCloseRef.current();
  }, [desktop, controls, y]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', esc);
    controls.start(desktop ? { opacity: 1, scale: 1, transition: MOLA } : { y: 0, transition: MOLA });
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
  }, [controls, desktop, fechar]);

  const soltar = (_: unknown, info: PanInfo) => {
    const h = painel.current?.offsetHeight ?? 600;
    const destino = info.offset.y + projetar(info.velocity.y);
    if (destino > h * 0.4) fechar(info.velocity.y);
    else animate(y, 0, { ...MOLA_ARREMESSO, velocity: info.velocity.y });
  };

  return (
    <div className={clsx('fixed inset-0 z-50 flex justify-center', desktop ? 'items-center p-6' : 'items-end')}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => fechar()} />
      <motion.div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={desktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
        animate={controls}
        style={desktop ? undefined : { y }}
        drag={desktop ? false : 'y'}
        dragListener={false}
        dragControls={dragCtl}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 1 }}
        dragMomentum={false}
        onDragEnd={soltar}
        className={clsx('relative w-full overflow-y-auto z-10 material',
          desktop ? 'max-w-[520px] max-h-[86dvh] rounded-[16px]' : 'max-w-[430px] max-h-[92dvh] rounded-t-[14px]')}
      >
        <div className="sticky top-0 z-10 cursor-grab active:cursor-grabbing touch-none select-none"
             onPointerDown={(e) => { if (!desktop) dragCtl.start(e); }}>
          {!desktop && <div className="pt-2 pb-1"><div className="w-9 h-[5px] rounded-full mx-auto" style={{ background: 'var(--text-3)', opacity: 0.4 }} /></div>}
          <div className="flex items-center px-4 pt-2 pb-2">
            <h2 className="t-headline flex-1" style={{ color: 'var(--text)' }}>{title}</h2>
            <button onClick={() => fechar()} aria-label="Fechar"
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center chip t-footnote font-bold"
              style={{ color: 'var(--text-2)' }}>✕</button>
          </div>
        </div>
        <div className={clsx('px-4', desktop ? 'pb-6' : 'pb-[calc(24px+env(safe-area-inset-bottom,0px))]')}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
