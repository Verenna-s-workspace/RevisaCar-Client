import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, PrimaryBtn, OutlineBtn } from '../ui/pro';

const FUELS = ['flex', 'gasolina', 'etanol', 'diesel', 'gnv', 'eletrico'];

export function EditVehicleScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const [form, setForm] = useState({ color: '', mileage: '', fuel_type: 'flex' });
  useEffect(() => {
    if (v) setForm({ color: v.color ?? '', mileage: String(v.mileage ?? ''), fuel_type: v.fuel_type });
  }, [v]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      await vehiclesApi.update(id!, {
        color: form.color, mileage: Number(form.mileage) || 0, fuel_type: form.fuel_type as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle', id] });
      toast.success('Veículo atualizado!');
      navigate(`/veiculo/${id}`);
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: async () => { await vehiclesApi.delete(id!); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo removido');
      navigate('/veiculo');
    },
  });

  const label = (t: string) => (
    <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>{t}</label>
  );
  const inputStyle = { border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card };

  return (
    <>
      <MainLayout showNav={false} topbar={<Topbar title="Editar veículo" showBack />}>
        <div className="px-4 pt-5 pb-8 flex flex-col gap-5">
          {isLoading || !v ? (
            <Skeleton className="h-[300px] rounded-[18px]" />
          ) : (
            <>
              {/* Read-only identity */}
              <div className="rounded-[16px] p-4" style={{ background: C.bg }}>
                <p className="text-[16px] font-bold" style={{ color: C.text, fontFamily: FONT_HEAD }}>{v.brand} {v.model} {v.year}</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>Placa {v.plate} · não editável</p>
              </div>

              <div className="flex flex-col gap-1.5">
                {label('Cor')}
                <input value={form.color} onChange={e => setForm(s => ({ ...s, color: e.target.value }))}
                  className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none" style={inputStyle} />
              </div>

              <div className="flex flex-col gap-1.5">
                {label('Quilometragem')}
                <input value={form.mileage} inputMode="numeric"
                  onChange={e => setForm(s => ({ ...s, mileage: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none" style={inputStyle} />
              </div>

              <div className="flex flex-col gap-1.5">
                {label('Combustível')}
                <div className="flex flex-wrap gap-2">
                  {FUELS.map(f => (
                    <button key={f} onClick={() => setForm(s => ({ ...s, fuel_type: f }))}
                      className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold capitalize transition-all"
                      style={form.fuel_type === f
                        ? { background: C.brand, color: '#fff' }
                        : { background: C.card, color: C.muted, border: `1px solid ${C.border}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-1"><PrimaryBtn disabled={isPending} onClick={() => save()}>
                {isPending ? 'Salvando...' : 'Salvar alterações'}
              </PrimaryBtn></div>

              <button onClick={() => setShowDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-[13px] text-[13.5px] font-semibold"
                style={{ color: C.brand }}>
                <Trash2 size={16} /> Remover veículo
              </button>
            </>
          )}
        </div>
      </MainLayout>

      {showDelete && (
        <BottomSheet onClose={() => setShowDelete(false)} title="Remover veículo?">
          <p className="text-[13.5px] leading-relaxed pt-1 pb-5" style={{ color: C.muted }}>
            Todo o histórico e documentos deste veículo serão removidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => remove()}
              className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white active:scale-[0.98]"
              style={{ background: C.brand, fontFamily: FONT_HEAD }}>Remover veículo</button>
            <OutlineBtn onClick={() => setShowDelete(false)}>Cancelar</OutlineBtn>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
