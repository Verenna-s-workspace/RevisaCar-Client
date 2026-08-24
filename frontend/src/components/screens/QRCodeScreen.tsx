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

/* ─── Wallet button ─────────────────────────────── */
function WalletBtn({ brand }: { brand: 'apple' | 'google' }) {
  return (
    <button
      onClick={() => toast(`Adicionando à ${brand === 'apple' ? 'Apple' : 'Google'} Wallet`, { icon: '👛' })}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px]"
      style={{ background: '#14161A' }}>
      {brand === 'apple' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M16 13c0-3 2.3-4.3 2.4-4.4-1.3-1.9-3.3-2.2-4-2.2-1.7-.2-3.3 1-4.2 1-.8 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.5 2.8-2 3.4-.5 8.4 1.4 11.1.9 1.3 2 2.8 3.4 2.8 1.4-.1 1.9-.9 3.5-.9 1.7 0 2.1.9 3.5.9 1.5 0 2.4-1.3 3.3-2.7.6-.9 1-1.8 1.3-2.8-3.4-1.3-3.4-3.7-3.4-3.9z"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 11v2.8h3.9c-.2 1-1.5 2.9-3.9 2.9a4.3 4.3 0 010-8.6c1.2 0 2.1.5 2.6 1l1.9-1.9A7 7 0 1012 19c4 0 6.7-2.8 6.7-6.8 0-.5 0-.8-.1-1.2z"/></svg>
      )}
      <span className="text-[12.5px] font-semibold text-white">
        {brand === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
      </span>
    </button>
  );
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

            {/* Wallet buttons */}
            <div className="flex gap-3">
              <WalletBtn brand="apple" />
              <WalletBtn brand="google" />
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
