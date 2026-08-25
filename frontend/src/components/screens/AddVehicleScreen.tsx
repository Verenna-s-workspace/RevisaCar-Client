import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesApi, plateApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD, PrimaryBtn } from '../ui/pro';
import type { VehicleFormData, FuelType } from '../../types';

const FUELS: FuelType[] = ['flex', 'gasolina', 'etanol', 'diesel', 'gnv', 'eletrico', 'hibrido'];

type Form = { brand: string; model: string; year: string; color: string; fuel_type: FuelType };
const EMPTY: Form = { brand: '', model: '', year: '', color: '', fuel_type: 'flex' };

export function AddVehicleScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [plate, setPlate] = useState('');
  const [looking, setLooking] = useState(false);
  const [show, setShow] = useState(false);       // exibe o formulário do veículo
  const [form, setForm] = useState<Form>(EMPTY);
  const [km, setKm] = useState('');

  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  const lookup = async () => {
    setLooking(true);
    try {
      const { data } = await plateApi.lookup(plate);
      if (data.vehicle) {
        const v = data.vehicle;
        setForm({
          brand: v.brand ?? '', model: v.model ?? '',
          year: v.year ? String(v.year) : '', color: v.color ?? '',
          fuel_type: (v.fuel_type as FuelType) ?? 'flex',
        });
        toast.success('Encontramos seu veículo');
      } else {
        setForm(EMPTY);
        toast(data.available
          ? 'Não encontramos pela placa. Preencha os dados abaixo.'
          : 'Preencha os dados do veículo abaixo.');
      }
    } catch {
      setForm(EMPTY);
      toast('Não foi possível consultar agora. Preencha manualmente.');
    } finally {
      setShow(true);
      setLooking(false);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => vehiclesApi.create({
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year) || 0,
      color: form.color.trim() || undefined,
      fuel_type: form.fuel_type,
      plate: plate.toUpperCase(),
      mileage: Number(km) || 0,
    } as VehicleFormData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo adicionado!');
      navigate('/veiculo');
    },
    onError: () => toast.error('Erro ao salvar veículo'),
  });

  const canSave = form.brand.trim().length > 0 && form.model.trim().length > 0;

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <p className="text-[11.5px] font-semibold mb-1.5" style={{ color: C.muted }}>{label}</p>
      {node}
    </div>
  );
  const inputCls = 'w-full px-4 py-3 rounded-[13px] text-[14px] font-medium outline-none';
  const inputStyle = { border: `1px solid ${C.borderSoft}`, color: C.text, background: C.bg } as const;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Adicionar veículo" showBack />}>
      <div className="px-4 pt-5 pb-8 flex flex-col gap-5">

        {/* Plate input */}
        <div>
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: C.muted }}>Digite a placa</p>
          <div className="flex gap-2.5">
            <input
              value={plate}
              onChange={e => { setPlate(e.target.value.toUpperCase()); setShow(false); }}
              placeholder="ABC1D23" maxLength={7}
              className="flex-1 px-4 py-3.5 rounded-[13px] text-[16px] font-bold tracking-[3px] text-center outline-none uppercase"
              style={{ border: `1.5px solid ${C.border}`, color: C.text, background: C.card, fontFamily: FONT_HEAD }} />
            <button onClick={lookup} disabled={plate.length < 6 || looking}
              className="px-5 rounded-[13px] font-bold text-[14px] text-white flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: C.brand }}>
              {looking ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} Buscar
            </button>
          </div>
        </div>

        {/* Vehicle form (pré-preenchido pela placa, editável) */}
        {show && (
          <div className="rounded-[16px] p-5 flex flex-col gap-3.5 animate-fade-up" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {canSave && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: C.greenBg }}>
                  <Check size={12} color={C.greenDk} strokeWidth={3} />
                </div>
                <p className="text-[12px] font-bold" style={{ color: C.greenDk }}>Confira os dados do veículo</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {field('Marca', <input value={form.brand} onChange={e => set({ brand: e.target.value })} placeholder="Fiat" className={inputCls} style={inputStyle} />)}
              {field('Modelo', <input value={form.model} onChange={e => set({ model: e.target.value })} placeholder="Uno" className={inputCls} style={inputStyle} />)}
              {field('Ano', <input value={form.year} onChange={e => set({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2020" inputMode="numeric" className={inputCls} style={inputStyle} />)}
              {field('Cor', <input value={form.color} onChange={e => set({ color: e.target.value })} placeholder="Prata" className={inputCls} style={inputStyle} />)}
            </div>

            {field('Combustível', (
              <select value={form.fuel_type} onChange={e => set({ fuel_type: e.target.value as FuelType })} className={inputCls} style={inputStyle}>
                {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            ))}

            {field('Quilometragem atual', (
              <input value={km} onChange={e => setKm(e.target.value.replace(/\D/g, ''))} placeholder="45000" inputMode="numeric" className={inputCls} style={inputStyle} />
            ))}
          </div>
        )}

        {show && (
          <PrimaryBtn disabled={isPending || !canSave} onClick={() => mutate()}>
            {isPending ? 'Salvando...' : 'Salvar veículo'}
          </PrimaryBtn>
        )}

      </div>
    </MainLayout>
  );
}
