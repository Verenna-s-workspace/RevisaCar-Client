import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, AlertTriangle, X, Camera, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { historyApi, inspectionsApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, healthColor } from '../ui/pro';
import type { InspectionStatus } from '../../types';

const STATUS_CFG: Record<InspectionStatus, { color: string; bg: string; label: string; Icon: any }> = {
  ok:      { color: C.greenDk, bg: C.greenBg, label: 'OK',       Icon: Check },
  atencao: { color: '#C98A00', bg: '#FFF3D6', label: 'Atenção',  Icon: AlertTriangle },
  critico: { color: C.brand,   bg: '#FDEAEC', label: 'Crítico',  Icon: X },
};

export function InspectionReportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: service } = useQuery({
    queryKey: ['service', id],
    queryFn: () => historyApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const inspId = service?.inspection_id;
  const { data: insp, isLoading } = useQuery({
    queryKey: ['inspection', inspId],
    queryFn: () => inspectionsApi.get(inspId!).then(r => r.data),
    enabled: !!inspId,
  });

  const counts = insp
    ? {
        ok: insp.items.filter(i => i.status === 'ok').length,
        atencao: insp.items.filter(i => i.status === 'atencao').length,
        critico: insp.items.filter(i => i.status === 'critico').length,
      }
    : { ok: 0, atencao: 0, critico: 0 };

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Relatório de inspeção" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {isLoading || !insp ? (
          <>
            <Skeleton className="h-[120px] rounded-[18px]" />
            <Skeleton className="h-[260px] rounded-[18px]" />
          </>
        ) : (
          <>
            {/* Header with score */}
            <div className="rounded-[18px] p-5 flex items-center gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="relative flex-none" style={{ width: 64, height: 64 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" stroke={C.border} strokeWidth="6" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke={healthColor(insp.overall_score)} strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(insp.overall_score/100)*2*Math.PI*27} ${2*Math.PI*27}`} transform="rotate(-90 32 32)" />
                  <text x="32" y="38" textAnchor="middle" fontSize="19" fontWeight="800" fill={C.text} fontFamily="'Sora',sans-serif">{insp.overall_score}</text>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold" style={{ color: C.text, fontFamily: FONT_HEAD }}>{insp.vehicle_label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>
                  {format(new Date(insp.date), 'dd/MM/yyyy', { locale: ptBR })} · {insp.mileage?.toLocaleString('pt-BR')} km
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <User size={13} color={C.subtle} />
                  <span className="text-[11.5px]" style={{ color: C.subtle }}>Inspetor: {insp.inspector}</span>
                </div>
              </div>
            </div>

            {/* Summary counts */}
            <div className="flex gap-2.5">
              {([['ok', counts.ok], ['atencao', counts.atencao], ['critico', counts.critico]] as [InspectionStatus, number][]).map(([st, n]) => {
                const cfg = STATUS_CFG[st];
                return (
                  <div key={st} className="flex-1 rounded-[12px] py-2.5 text-center" style={{ background: cfg.bg }}>
                    <p className="text-[18px] font-extrabold tabular" style={{ color: cfg.color, fontFamily: FONT_HEAD }}>{n}</p>
                    <p className="text-[10.5px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Photos */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: C.subtle }}>Fotos da inspeção</p>
              <div className="flex gap-2.5 overflow-x-auto hide-scrollbar">
                {insp.photos.map((label, i) => (
                  <div key={i} className="flex-none w-[88px] h-[88px] rounded-[12px] flex flex-col items-center justify-center gap-1.5"
                       style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                    <Camera size={20} color={C.subtle} />
                    <span className="text-[9.5px] font-medium text-center px-1" style={{ color: C.muted }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Items checklist */}
            <div className="rounded-[18px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {insp.items.map((it, i) => {
                const cfg = STATUS_CFG[it.status];
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3"
                       style={{ borderBottom: i === insp.items.length - 1 ? 'none' : `1px solid ${C.borderSoft}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-none mt-0.5" style={{ background: cfg.bg }}>
                      <cfg.Icon size={14} color={cfg.color} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold" style={{ color: C.text }}>{it.name}</p>
                      {it.note && <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: C.muted }}>{it.note}</p>}
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full flex-none" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {insp.recommendations.length > 0 && (
              <div className="rounded-[18px] p-5" style={{ background: '#FFF3D6', border: '1px solid rgba(201,138,0,.2)' }}>
                <p className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: '#9A7400' }}>Recomendações</p>
                <div className="flex flex-col gap-2">
                  {insp.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#C98A00] mt-0.5">•</span>
                      <p className="text-[13px] leading-snug" style={{ color: '#7a5c00' }}>{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => navigate('/agendar')}
              className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white active:scale-[0.98] transition-all"
              style={{ background: C.brand, fontFamily: FONT_HEAD }}>
              Agendar serviços recomendados
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
