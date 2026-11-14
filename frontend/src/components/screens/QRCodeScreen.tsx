import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Share2, ShieldCheck } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { dashboardApi, qrCodeApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD } from '../ui/pro';

/* ─── QR Canvas (dark modules on white) ─────────── */
function QRCanvas({ value, size = 168 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      QRCodeLib.toCanvas(ref.current, value, {
        width: size, margin: 1, color: { dark: '#14161A', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [value, size]);
  return <canvas ref={ref} className="rounded-[8px]" />;
}

/* ─── Passe do veículo ──────────────────────────── */
export function QRCodeScreen() {
  const qc = useQueryClient();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    staleTime: 30_000,
  });
  const vehicle = dashboard?.active_vehicle;

  const { data: qr, isLoading } = useQuery({
    queryKey: ['qr', vehicle?.id],
    queryFn: () => qrCodeApi.get(vehicle!.id).then(r => r.data),
    enabled: !!vehicle?.id,
    staleTime: 60_000,
  });

  const { mutate: refresh, isPending } = useMutation({
    mutationFn: () => qrCodeApi.refresh(vehicle!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qr'] }); toast.success('Passe renovado!'); },
    onError: () => toast.error('Erro ao renovar'),
  });

  const qrValue = qr?.uuid ? `https://revisacar.app/p/${qr.uuid}` : '';

  const share = () => {
    if (navigator.share && qrValue) {
      navigator.share({ url: qrValue, title: 'RevisaCar — Passe do veículo' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(qrValue)
        .then(() => toast.success('Link copiado!')).catch(() => toast.error('Erro ao copiar'));
    }
  };

  return (
    <MainLayout showNav={false} topbar={
      <Topbar title="Passe do veículo" showBack
        right={<ShieldCheck size={20} color={C.muted} strokeWidth={1.8} />} />
    }>
      <div className="px-4 pt-3 pb-8 flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>
          Apresente na oficina para um atendimento rápido e seguro.
        </p>

        {isLoading || !vehicle ? (
          <Skeleton className="h-[420px] rounded-[24px]" />
        ) : (
          <>
            {/* Pass card */}
            <div className="rounded-[24px] p-6 relative overflow-hidden"
                 style={{ background: 'linear-gradient(165deg,#23272F,#14161A 70%)' }}>
              <div style={{ position:'absolute', top:-50, right:-40, width:180, height:180, borderRadius:'50%',
                            background:'radial-gradient(circle,rgba(204,20,0,.18),transparent 70%)' }} />

              {/* Header */}
              <div className="flex items-center justify-between relative">
                <span className="text-[13px] font-extrabold tracking-wide text-white" style={{ fontFamily: FONT_HEAD }}>
                  REVISA<span style={{ color: C.brand }}>CAR</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }}>PASSE</span>
              </div>

              {/* Vehicle */}
              <div className="mt-4 relative">
                <p className="text-[22px] font-extrabold text-white" style={{ fontFamily: FONT_HEAD }}>
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-[13px] mt-0.5 tracking-[1px]" style={{ color: '#9AA0A8' }}>{vehicle.plate}</p>
              </div>

              {/* QR */}
              <div className="flex justify-center my-5 relative">
                <div className="p-3 rounded-[16px] bg-white">
                  {qrValue ? <QRCanvas value={qrValue} /> : (
                    <div className="w-[168px] h-[168px] rounded-[8px] flex items-center justify-center" style={{ background: '#F4F4F4' }}>
                      <p className="text-[12px]" style={{ color: C.subtle }}>Gerando...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex relative pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
                {[
                  { l: 'COMBUSTÍVEL', v: vehicle.fuel_type, c: '#fff' },
                  { l: 'KM', v: vehicle.mileage?.toLocaleString('pt-BR'), c: '#fff' },
                  { l: 'STATUS', v: 'Ativo', c: C.green },
                ].map(s => (
                  <div key={s.l} className="flex-1">
                    <p className="text-[9px] font-bold tracking-widest" style={{ color: '#6B7078' }}>{s.l}</p>
                    <p className="text-[13px] font-bold mt-0.5 capitalize" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust footer */}
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} color={C.green} />
              <p className="text-[11.5px] font-medium" style={{ color: C.subtle }}>
                Seguro · Privado · Validado pela RevisaCar
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-1">
              <button onClick={() => refresh()} disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-[13px] rounded-[12px] text-[13.5px] font-semibold disabled:opacity-60"
                style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
                <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} /> Renovar
              </button>
              <button onClick={share}
                className="flex-1 flex items-center justify-center gap-2 py-[13px] rounded-[12px] text-white text-[13.5px] font-semibold"
                style={{ background: C.brand }}>
                <Share2 size={16} /> Compartilhar
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
