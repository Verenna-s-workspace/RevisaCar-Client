import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD, PrimaryBtn } from '../ui/pro';
import type { VehicleFormData } from '../../types';

/* Mock plate lookup — simulates a DETRAN/placa API */
const PLATE_DB: Record<string, Partial<VehicleFormData>> = {
  'ABC1D23': { brand: 'Hyundai', model: 'HB20', year: 2020, color: 'Prata', fuel_type: 'flex' },
  'XYZ4K56': { brand: 'Chevrolet', model: 'Onix', year: 2021, color: 'Branco', fuel_type: 'flex' },
};

export function AddVehicleScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [plate, setPlate] = useState('');
  const [found, setFound] = useState<Partial<VehicleFormData> | null>(null);
  const [km, setKm] = useState('');

  const lookup = () => {
    const key = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hit = PLATE_DB[key] ?? { brand: 'Volkswagen', model: 'Gol', year: 2019, color: 'Prata', fuel_type: 'flex' as const };
    setFound(hit);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => vehiclesApi.create({
      ...(found as VehicleFormData),
      plate: plate.toUpperCase(),
      mileage: Number(km) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo adicionado!');
      navigate('/veiculo');
    },
    onError: () => toast.error('Erro ao salvar veículo'),
  });

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Adicionar veículo" showBack />}>
      <div className="px-4 pt-5 pb-8 flex flex-col gap-5">

        {/* Plate input */}
        <div>
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: C.muted }}>Digite a placa</p>
          <div className="flex gap-2.5">
            <input
              value={plate}
              onChange={e => { setPlate(e.target.value.toUpperCase()); setFound(null); }}
              placeholder="ABC1D23" maxLength={7}
              className="flex-1 px-4 py-3.5 rounded-[13px] text-[16px] font-bold tracking-[3px] text-center outline-none uppercase"
              style={{ border: `1.5px solid ${C.border}`, color: C.text, background: C.card, fontFamily: FONT_HEAD }} />
            <button onClick={lookup} disabled={plate.length < 6}
              className="px-5 rounded-[13px] font-bold text-[14px] text-white flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: C.brand }}>
              <Search size={17} /> Buscar
            </button>
          </div>
        </div>

        {/* Result */}
        {found && (
          <div className="rounded-[16px] p-5 animate-fade-up" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: C.greenBg }}>
                <Check size={12} color={C.greenDk} strokeWidth={3} />
              </div>
              <p className="text-[12px] font-bold" style={{ color: C.greenDk }}>Encontramos seu veículo</p>
            </div>
            <p className="text-[20px] font-extrabold" style={{ color: C.text, fontFamily: FONT_HEAD }}>
              {found.brand} {found.model}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: C.muted }}>
              {found.year} · {found.fuel_type} · {found.color}
            </p>

            <div className="mt-4">
              <p className="text-[11.5px] font-semibold mb-1.5" style={{ color: C.muted }}>Quilometragem atual</p>
              <input value={km} onChange={e => setKm(e.target.value.replace(/\D/g, ''))}
                placeholder="45000" inputMode="numeric"
                className="w-full px-4 py-3 rounded-[13px] text-[14px] font-medium outline-none"
                style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.bg }} />
            </div>
          </div>
        )}

        {found && (
          <PrimaryBtn disabled={isPending} onClick={() => mutate()}>
            {isPending ? 'Salvando...' : 'Salvar veículo'}
          </PrimaryBtn>
        )}

      </div>
    </MainLayout>
  );
}
