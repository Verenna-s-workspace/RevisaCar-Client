import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Calendar, FileText, QrCode, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
import { MainLayout } from '../layout';
import { Skeleton } from '../ui';
import { useAuthStore } from '../../store/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ─── Tokens ────────────────────────────────────────────── */
const BRAND  = '#CC1400';
const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';

/* ─── Health Score Arc ──────────────────────────────────── */
function HealthArc({ score }: { score: number }) {
  const r = 54;
  const cx = 70, cy = 72;
  const total = Math.PI * r;
  const dash  = (score / 100) * total;
  const color = score >= 80 ? '#18B26B' : score >= 60 ? '#F4A724' : BRAND;
  const label = score >= 80 ? 'Bom estado' : score >= 60 ? 'Atenção' : 'Crítico';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="88" viewBox="0 0 140 88">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
              fill="none" stroke={BORDER} strokeWidth="9" strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
              fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${dash} ${total}`} />
        <text x={cx} y={cy-10} textAnchor="middle" fontSize="30" fontWeight="800"
              fill={TEXT} fontFamily="'Sora',sans-serif">{score}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize="11" fontWeight="600"
              fill={color} fontFamily="'Plus Jakarta Sans',sans-serif">{label}</text>
      </svg>
      <p className="text-[10px] font-bold tracking-widest mt-0.5" style={{ color: SUBTLE }}>SAÚDE</p>
    </div>
  );
}

/* ─── System Pill ───────────────────────────────────────── */
function SystemPill({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? '#18B26B' : score >= 60 ? '#F4A724' : BRAND;
  const status = score >= 80 ? 'Ótimo' : score >= 60 ? 'Atenção' : 'Crítico';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-[10px]" style={{ background: BG }}>
      <div className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
      <span className="text-[12px] font-semibold flex-1" style={{ color: TEXT }}>{label}</span>
      <span className="text-[11px] font-semibold" style={{ color }}>{status}</span>
    </div>
  );
}

/* ─── Quick Actions ─────────────────────────────────────── */
const ACTIONS = [
  { icon: Calendar, label: 'Agendar',    to: '/agendar',    bg: '#FDEAEC', ic: BRAND     },
  { icon: FileText, label: 'Orçamentos', to: '/orcamentos', bg: '#EAF1FB', ic: '#2A6FDB' },
  { icon: QrCode,   label: 'QR Code',    to: '/qr',         bg: '#E9F7EF', ic: '#18B26B' },
  { icon: MapPin,   label: 'Oficinas',   to: '/historico',  bg: '#FFF3D6', ic: '#C98A00' },
];

/* ─── Dashboard ─────────────────────────────────────────── */
export function DashboardScreen() {
  const navigate  = useNavigate();
  const { session } = useAuthStore();
  const firstName = session?.name?.split(' ')[0] ?? 'Dev';

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });

  const vehicle = dash?.active_vehicle;
  const health  = dash?.health_score ?? 86;
  const systems = [
    { label: 'Óleo',   score: 65 },
    { label: 'Freios', score: 90 },
    { label: 'Pneus',  score: 77 },
  ];

  return (
    <MainLayout topbar={
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-[56px]"
              style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <p className="text-[11px] font-medium" style={{ color: SUBTLE }}>Bem-vindo de volta</p>
          <p className="text-[16px] font-bold" style={{ color: TEXT, fontFamily: "'Sora',sans-serif" }}>
            Olá, {firstName}
          </p>
        </div>
        <button aria-label="Notificações" onClick={() => navigate('/notificacoes')}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <Bell size={19} color={TEXT} strokeWidth={1.8} />
          {(dash?.unread_notifications_count ?? 1) > 0 && (
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full" style={{ background: BRAND }} />
          )}
        </button>
      </header>
    }>
      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">

        {/* Vehicle card + Health Score */}
        {isLoading ? (
          <Skeleton className="h-[192px] rounded-[18px]" />
        ) : vehicle ? (
          <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-[17px]" style={{ color: TEXT, fontFamily: "'Sora',sans-serif" }}>
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-[12px] mt-0.5 font-medium" style={{ color: MUTED }}>
                  {vehicle.plate} · {vehicle.fuel_type} · {vehicle.mileage?.toLocaleString('pt-BR')} km
                </p>
              </div>
              <button onClick={() => navigate(`/veiculo/${vehicle.id}`)}>
                <ChevronRight size={18} color={SUBTLE} />
              </button>
            </div>
            <button onClick={() => navigate('/saude')} className="flex items-center gap-3 w-full text-left">
              <HealthArc score={health} />
              <div className="flex-1 flex flex-col gap-2">
                {systems.map(s => <SystemPill key={s.label} {...s} />)}
              </div>
            </button>
          </div>
        ) : (
          <button onClick={() => navigate('/veiculos')}
                  className="rounded-[18px] p-5 flex flex-col items-center gap-3 border-2 border-dashed"
                  style={{ borderColor: BORDER }}>
            <p className="text-[14px] font-semibold" style={{ color: MUTED }}>+ Adicionar veículo</p>
          </button>
        )}

        {/* Próxima ação */}
        <div className="rounded-[14px] p-4 flex items-center gap-3"
             style={{ background: '#FDEAEC', border: `1px solid rgba(204,20,0,.12)` }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
               style={{ background: BRAND }}>
            <Calendar size={17} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BRAND }}>Próxima ação</p>
            <p className="text-[13px] font-bold mt-0.5" style={{ color: TEXT }}>Troca de óleo</p>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Em 1.200 km · vence 15/05</p>
          </div>
          <button onClick={() => navigate('/agendar')}
                  className="text-[12px] font-bold px-3 py-1.5 rounded-[8px] whitespace-nowrap"
                  style={{ background: BRAND, color: '#fff' }}>
            Agendar
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {ACTIONS.map(({ icon: Icon, label, to, bg, ic }) => (
            <button key={label} onClick={() => navigate(to)} className="flex flex-col items-center gap-2">
              <div className="w-[58px] h-[58px] rounded-[16px] flex items-center justify-center"
                   style={{ background: bg }}>
                <Icon size={22} color={ic} strokeWidth={1.8} />
              </div>
              <span className="text-[10.5px] font-semibold" style={{ color: MUTED }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Atividade recente */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold" style={{ color: TEXT, fontFamily: "'Sora',sans-serif" }}>
              Atividade recente
            </p>
            <button onClick={() => navigate('/historico')} className="flex items-center gap-1">
              <span className="text-[12px] font-semibold" style={{ color: BRAND }}>Ver tudo</span>
              <ArrowRight size={13} color={BRAND} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              [0,1].map(i => <Skeleton key={i} className="h-[64px] rounded-[14px]" />)
            ) : (dash?.recent_services ?? []).length === 0 ? (
              <p className="text-center py-8 text-[13px]" style={{ color: SUBTLE }}>
                Nenhum serviço registrado ainda.
              </p>
            ) : (
              (dash?.recent_services ?? []).slice(0, 3).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-[14px]"
                     style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
                       style={{ background: BG }}>
                    <Calendar size={16} color={SUBTLE} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: TEXT }}>
                      {s.service_type}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: SUBTLE }}>
                      {(s.service_date || s.scheduled_date)
                        ? format(new Date(s.service_date || s.scheduled_date), 'dd/MM', { locale: ptBR })
                        : '—'} · {s.mileage?.toLocaleString('pt-BR') ?? '—'} km
                    </p>
                  </div>
                  {s.total_cost && (
                    <span className="text-[13px] font-bold tabular" style={{ color: TEXT }}>
                      R$ {s.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
