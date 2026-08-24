import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Car, Pencil, Activity, ClipboardList, FileText, Calendar, ChevronRight } from 'lucide-react';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, healthFor, healthColor, healthLabel } from '../ui/pro';

/* ─── Spec cell ─────────────────────────────────── */
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-[12px]" style={{ background: C.bg }}>
      <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.subtle }}>{label}</p>
      <p className="text-[14px] font-bold mt-1" style={{ color: C.text }}>{value}</p>
    </div>
  );
}

export function VehicleDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const score = healthFor(id);
  const color = healthColor(score);

  return (
    <MainLayout showNav={false} topbar={
      <Topbar title={v ? `${v.brand} ${v.model}` : 'Veículo'} showBack
        right={
          <button onClick={() => navigate(`/veiculo/${id}/editar`)} className="w-10 h-10 flex items-center justify-center">
            <Pencil size={18} color={C.text} strokeWidth={1.8} />
          </button>
        } />
    }>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {isLoading || !v ? (
          <>
            <Skeleton className="h-[150px] rounded-[18px]" />
            <Skeleton className="h-[120px] rounded-[18px]" />
          </>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-[18px] p-5 flex items-center gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="w-[72px] h-[56px] rounded-[12px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
                <Car size={30} color={C.subtle} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[18px]" style={{ color: C.text, fontFamily: FONT_HEAD }}>{v.brand} {v.model}</p>
                  {v.is_active && (
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: C.greenBg, color: C.greenDk }}>Principal</span>
                  )}
                </div>
                <p className="text-[13px] mt-0.5" style={{ color: C.muted }}>{v.plate}</p>
              </div>
            </div>

            {/* Health */}
            <button onClick={() => navigate('/saude')}
              className="rounded-[18px] p-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="relative flex-none" style={{ width: 56, height: 56 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke={C.border} strokeWidth="5" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={`${(score/100)*2*Math.PI*24} ${2*Math.PI*24}`} transform="rotate(-90 28 28)" />
                  <text x="28" y="33" textAnchor="middle" fontSize="17" fontWeight="800" fill={C.text} fontFamily="var(--font-heading)">{score}</text>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-bold" style={{ color: C.text }}>Saúde do veículo</p>
                <p className="text-[12px] mt-0.5" style={{ color }}>{healthLabel(score)} · ver detalhes</p>
              </div>
              <ChevronRight size={18} color={C.subtle} />
            </button>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-2.5">
              <Spec label="Ano" value={String(v.year)} />
              <Spec label="Combustível" value={v.fuel_type} />
              <Spec label="Quilometragem" value={`${v.mileage?.toLocaleString('pt-BR')} km`} />
              <Spec label="Cor" value={v.color ?? '—'} />
              <Spec label="Câmbio" value="Manual" />
              <Spec label="Renavam" value={v.renavam ?? '—'} />
            </div>

            {/* Actions */}
            <div className="rounded-[16px] overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {[
                { icon: ClipboardList, label: 'Histórico de serviços', to: '/historico' },
                { icon: FileText, label: 'Documentos', to: '/documentos' },
                { icon: Activity, label: 'Linha do tempo', to: '/historico' },
              ].map((a, i, arr) => (
                <button key={a.label} onClick={() => navigate(a.to)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02]"
                  style={{ borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.borderSoft}` }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
                    <a.icon size={18} color={C.muted} />
                  </div>
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: C.text }}>{a.label}</span>
                  <ChevronRight size={18} color={C.subtle} />
                </button>
              ))}
            </div>

            <button onClick={() => navigate('/agendar')}
              className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white active:scale-[0.98] transition-all"
              style={{ background: C.brand, fontFamily: FONT_HEAD }}>
              Agendar manutenção
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
