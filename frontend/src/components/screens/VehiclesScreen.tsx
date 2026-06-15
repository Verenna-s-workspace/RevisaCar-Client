import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Car, Calendar, History, Pencil, Trash2, Fuel, Hash, Gauge, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { vehiclesApi } from '../../services/api';
import { Button, Input, Select, Badge, PlateBadge, SkeletonList, EmptyState } from '../ui';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import type { Vehicle, FuelType } from '../../types';
import { clsx } from 'clsx';

/* ─── Schema ────────────────────────────────────────────── */
const schema = z.object({
  brand:     z.string().min(1, 'Obrigatório'),
  model:     z.string().min(1, 'Obrigatório'),
  year:      z.coerce.number().min(1950).max(2035),
  plate:     z.string().min(7, 'Placa inválida'),
  color:     z.string().optional(),
  fuel_type: z.enum(['flex','gasolina','etanol','diesel','eletrico','gnv','hibrido']),
  mileage:   z.coerce.number().min(0),
  renavam:   z.string().optional(),
  vin:       z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const FUEL_OPTIONS = [
  { value: '',         label: 'Selecione o combustível' },
  { value: 'flex',     label: '⛽ Flex' },
  { value: 'gasolina', label: '⛽ Gasolina' },
  { value: 'etanol',   label: '🌿 Etanol' },
  { value: 'diesel',   label: '🏭 Diesel' },
  { value: 'eletrico', label: '⚡ Elétrico' },
  { value: 'gnv',      label: '💨 GNV' },
  { value: 'hibrido',  label: '🔋 Híbrido' },
];

const FUEL_LABEL: Record<FuelType, string> = {
  flex:'Flex', gasolina:'Gasolina', etanol:'Etanol',
  diesel:'Diesel', eletrico:'Elétrico', gnv:'GNV', hibrido:'Híbrido',
};

/* ─── Vehicle Form Modal ────────────────────────────────── */
function VehicleForm({ vehicle, onClose }: { vehicle?: Vehicle; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!vehicle;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ? {
      brand: vehicle.brand, model: vehicle.model, year: vehicle.year,
      plate: vehicle.plate, color: vehicle.color ?? '', fuel_type: vehicle.fuel_type,
      mileage: vehicle.mileage, renavam: vehicle.renavam ?? '', vin: vehicle.vin ?? '',
    } : { fuel_type: 'flex', mileage: 0, year: new Date().getFullYear() },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await vehiclesApi.update(vehicle!.id, data);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await vehiclesApi.create(data);
        toast.success('Veículo adicionado! 🚗');
      }
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar veículo');
    }
  };

  return (
    <BottomSheet onClose={onClose} title={isEdit ? 'Editar Veículo' : 'Adicionar Veículo'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        {/* Brand + Model */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Marca" placeholder="Honda" error={errors.brand?.message} {...register('brand')} />
          <Input label="Modelo" placeholder="Civic" error={errors.model?.message} {...register('model')} />
        </div>
        {/* Year + Color */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ano" type="number" placeholder="2022" error={errors.year?.message} {...register('year')} />
          <Input label="Cor" placeholder="Branco Lunar" {...register('color')} />
        </div>
        {/* Plate */}
        <Input
          label="Placa"
          placeholder="ABC-1234"
          error={errors.plate?.message}
          prefix={<Hash size={15} />}
          {...register('plate')}
        />
        {/* Fuel */}
        <Select label="Combustível" options={FUEL_OPTIONS} error={errors.fuel_type?.message} {...register('fuel_type')} />
        {/* Mileage */}
        <Input
          label="Quilometragem atual"
          type="number"
          placeholder="0"
          error={errors.mileage?.message}
          prefix={<Gauge size={15} />}
          suffix={<span className="text-xs text-text-subtle font-medium">km</span>}
          {...register('mileage')}
        />
        {/* Optional */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            Informações opcionais
          </p>
          <div className="flex flex-col gap-3">
            <Input label="RENAVAM" placeholder="00000000000" hint="11 dígitos" {...register('renavam')} />
            <Input label="Chassi / VIN" placeholder="9BWZZZ377VT004251" hint="17 caracteres" {...register('vin')} />
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
          {isEdit ? 'Salvar alterações' : 'Adicionar veículo'}
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>
          Cancelar
        </Button>
      </form>
    </BottomSheet>
  );
}

/* ─── Delete Confirm ────────────────────────────────────── */
function DeleteConfirm({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () => vehiclesApi.delete(vehicle.id),
    onSuccess: () => {
      toast.success('Veículo removido');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    },
    onError: () => toast.error('Erro ao remover veículo'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-2xl p-6 w-full max-w-sm z-10 shadow-xl"
      >
        <div className="w-14 h-14 bg-crit-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-crit" />
        </div>
        <h3 className="font-bold text-base text-text text-center mb-1.5">Remover veículo?</h3>
        <p className="text-sm text-text-muted text-center mb-6 leading-relaxed">
          <span className="font-semibold text-text">{vehicle.brand} {vehicle.model} ({vehicle.plate})</span>
          {' '}será removido permanentemente.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="danger" fullWidth loading={isPending} onClick={() => mutate()}>
            <Trash2 size={15} /> Remover
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Vehicle Card ──────────────────────────────────────── */
function VehicleCard({ vehicle, onEdit, onDelete }: {
  vehicle: Vehicle; onEdit: () => void; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-surface-2 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
          vehicle.is_active ? 'bg-crit-bg' : 'bg-surface-3'
        )}>
          <Car size={22} className={vehicle.is_active ? 'text-brand' : 'text-text-muted'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base text-text leading-tight">
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </div>
          <div className="mt-1">
            <PlateBadge plate={vehicle.plate} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={vehicle.is_active ? 'ok' : 'neutral'}>
            {vehicle.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={16} className="text-text-ghost" />
          </motion.div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-border mx-4">
              {[
                { icon: Fuel,   label: 'Combustível', value: FUEL_LABEL[vehicle.fuel_type] },
                { icon: Gauge,  label: 'Quilometragem', value: `${vehicle.mileage?.toLocaleString('pt-BR')} km` },
                { label: 'Cor',     value: vehicle.color || '—' },
                { label: 'RENAVAM', value: vehicle.renavam ? `•••••••••${vehicle.renavam.slice(-2)}` : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-surface-2 p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {Icon && <Icon size={12} className="text-text-subtle" />}
                    <span className="text-2xs font-bold text-text-subtle uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-text">{value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t border-border bg-white">
              <Button
                size="sm"
                onClick={() => navigate('/agendar')}
                className="flex-1"
              >
                <Calendar size={14} /> Agendar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/historico')}
                icon={<History size={14} />}
              >
                Histórico
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                icon={<Pencil size={14} />}
              />
              <Button
                size="sm"
                variant="danger"
                onClick={onDelete}
                icon={<Trash2 size={14} />}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Vehicles Screen ───────────────────────────────────── */
export function VehiclesScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [editV, setEditV]     = useState<Vehicle | null>(null);
  const [delV, setDelV]       = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });

  return (
    <>
      <MainLayout
        topbar={
          <Topbar
            title="Meus Veículos"
            showBack
            right={
              <button
                onClick={() => setShowAdd(true)}
                className="w-9 h-9 flex items-center justify-center text-brand
                           hover:bg-crit-bg rounded-xl transition-colors"
              >
                <Plus size={22} />
              </button>
            }
          />
        }
      >
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Summary chip */}
          {!isLoading && vehicles.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="text-xs font-semibold text-text-muted">
                {vehicles.length} veículo{vehicles.length > 1 ? 's' : ''} cadastrado{vehicles.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {isLoading ? (
            <SkeletonList count={2} />
          ) : vehicles.length === 0 ? (
            <EmptyState
              icon={<Car size={34} />}
              title="Nenhum veículo cadastrado"
              description="Adicione seu veículo para começar a agendar manutenções e acompanhar o histórico."
              action={
                <Button onClick={() => setShowAdd(true)} icon={<Plus size={16} />}>
                  Adicionar veículo
                </Button>
              }
            />
          ) : (
            <>
              {vehicles.map(v => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  onEdit={() => setEditV(v)}
                  onDelete={() => setDelV(v)}
                />
              ))}

              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center justify-center gap-2.5 p-5 bg-white
                           border-2 border-dashed border-border-md rounded-2xl
                           text-text-muted text-sm font-semibold
                           hover:border-brand hover:text-brand hover:bg-crit-bg
                           active:scale-[0.98] transition-all duration-150 w-full mt-1"
              >
                <Plus size={18} />
                Adicionar novo veículo
              </button>
            </>
          )}
        </div>
      </MainLayout>

      <AnimatePresence>
        {showAdd && <VehicleForm onClose={() => setShowAdd(false)} />}
        {editV   && <VehicleForm vehicle={editV} onClose={() => setEditV(null)} />}
        {delV    && <DeleteConfirm vehicle={delV} onClose={() => setDelV(null)} />}
      </AnimatePresence>
    </>
  );
}
