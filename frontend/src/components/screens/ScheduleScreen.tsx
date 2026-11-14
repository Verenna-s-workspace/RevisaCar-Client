import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addMonths, subMonths, startOfMonth, getDaysInMonth,
  getDay, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Check, Car,
  Wrench, RotateCcw, Gauge, Wind, Plus, Zap, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { vehiclesApi, availabilityApi, appointmentsApi, oficinasApi } from '../../services/api';
import type { OficinaVinculo } from '../../types';
import { Button, Spinner } from '../ui';
import { MainLayout, Topbar } from '../layout';
import { clsx } from 'clsx';

/* ─── Step Progress ─────────────────────────────────────── */
const STEP_LABELS = ['Serviço', 'Data', 'Horário', 'Confirmar'];

function StepProgress({ current }: { current: number }) {
  return (
    <div className="glass mx-4 mt-1 rounded-[24px] flex items-center px-4 py-3.5">
      {STEP_LABELS.map((label, i) => {
        const num  = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10',
                done   ? 'bg-brand text-white'                     :
                active ? 'nav-raised !shadow-[0_4px_12px_rgba(204,20,0,0.3)]' :
                         'bg-white text-text-subtle'
              )}>
                {done ? <Check size={13} strokeWidth={3} /> : num}
              </div>
              <span className={clsx(
                'text-2xs font-semibold whitespace-nowrap',
                active ? 'text-brand' : done ? 'text-text-3' : 'text-text-subtle'
              )}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={clsx(
                'flex-1 h-0.5 mx-1.5 mb-4 rounded-full transition-all duration-300',
                done ? 'bg-brand' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Vehicle Picker ────────────────────────────────────── */
function VehiclePicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });
  useEffect(() => {
    if (!selected && vehicles.length > 0)
      onSelect(vehicles.find(v => v.is_active)?.id || vehicles[0].id);
  }, [vehicles, selected, onSelect]);

  if (isLoading) return null;
  if (vehicles.length === 0) {
    return (
      <div className="glass mx-4 mt-4 rounded-[22px] px-4 py-3 flex items-center gap-3">
        <Car size={17} className="text-brand" />
        <p className="flex-1 text-sm text-text">Cadastre um veículo para agendar.</p>
        <button onClick={() => navigate('/veiculos/novo')} className="text-xs font-medium text-brand hover:underline">Adicionar</button>
      </div>
    );
  }
  const active = vehicles.find(v => v.id === selected) ?? vehicles[0];

  return (
    <div className="glass mx-4 mt-4 rounded-[22px] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
          <Car size={17} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-text leading-tight truncate">
            {active.brand} {active.model} {active.year}
          </p>
          <p className="text-xs text-text-muted">{active.plate} · {active.mileage?.toLocaleString('pt-BR')} km</p>
        </div>
        {vehicles.length > 1 && (
          <button onClick={() => setAberto(a => !a)} aria-expanded={aberto}
            className="text-xs font-medium text-brand hover:underline">{aberto ? 'Fechar' : 'Trocar'}</button>
        )}
      </div>
      {aberto && vehicles.filter(v => v.id !== active.id).map(v => (
        <button key={v.id} onClick={() => { onSelect(v.id); setAberto(false); }}
          className="w-full text-left px-4 py-3 border-t border-black/5 hover:bg-white/70 transition-colors">
          <p className="font-semibold text-sm text-text">{v.brand} {v.model} {v.year}</p>
          <p className="text-xs text-text-muted">{v.plate}</p>
        </button>
      ))}
    </div>
  );
}

/* ─── Oficina Picker ────────────────────────────────────── */
// O pedido vai para uma oficina em que o cliente entrou (convite). Com uma só,
// ela é escolhida sozinha; com várias, o cliente escolhe.
function OficinaPicker({ oficinas, selected, onSelect }: {
  oficinas: OficinaVinculo[]; selected: string; onSelect: (doc: string) => void;
}) {
  if (oficinas.length <= 1) {
    const o = oficinas[0];
    return o ? (
      <div className="glass mx-4 mt-3 px-4 py-2.5 rounded-full flex items-center gap-2 text-sm">
        <Store size={15} className="text-brand" />
        <span className="text-text-muted">Oficina:</span>
        <span className="font-medium text-text truncate">{o.nome || 'Sua oficina'}</span>
      </div>
    ) : null;
  }
  return (
    <div className="mx-4 mt-3">
      <p className="text-[13px] font-medium text-text-muted mb-2 px-1">Oficina</p>
      <div className="flex flex-wrap gap-2">
        {oficinas.map(o => (
          <button key={o.oficina_doc} onClick={() => onSelect(o.oficina_doc)} aria-pressed={selected === o.oficina_doc}
            className={clsx('px-3.5 py-2 rounded-full text-sm font-semibold border-[1.5px] transition-all',
              selected === o.oficina_doc ? 'border-brand bg-crit-bg text-brand' : 'border-border bg-white text-text')}>
            {o.nome || 'Oficina'}
          </button>
        ))}
      </div>
    </div>
  );
}

function SemOficina() {
  const navigate = useNavigate();
  return (
    <div className="glass mx-4 mt-6 rounded-[24px] p-6 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-white flex items-center justify-center">
        <Store size={26} className="text-brand" />
      </div>
      <p className="font-medium text-base text-text mt-3">Escolha sua oficina primeiro</p>
      <p className="text-sm text-text-muted mt-1 leading-relaxed">
        Para agendar, entre na sua oficina com o convite (QR ou link) que ela fornece.
      </p>
      <Button fullWidth size="lg" className="mt-4" onClick={() => navigate('/oficinas')}>Tenho um convite</Button>
    </div>
  );
}

/* ─── Services ──────────────────────────────────────────── */
// Paleta restrita: fundo neutro + ícone no acento da marca (sem arco-íris).
const SERVICES = [
  { id: 'oleo',        name: 'Troca de Óleo e Filtros',        desc: 'Óleo motor + filtro de óleo + filtro de ar',  icon: Gauge,    bg: 'bg-surface-3',   ic: 'text-brand'      },
  { id: 'revisao',     name: 'Revisão Geral',                  desc: 'Inspeção completa de 50+ itens do veículo',   icon: Wrench,   bg: 'bg-surface-3',   ic: 'text-brand'      },
  { id: 'freios',      name: 'Revisão dos Freios',             desc: 'Pastilhas, discos, fluido e sistema ABS',     icon: RotateCcw,bg: 'bg-surface-3',   ic: 'text-brand'      },
  { id: 'alinhamento', name: 'Alinhamento e Balanceamento',    desc: 'Geometria e equilíbrio das rodas',            icon: Zap,      bg: 'bg-surface-3',   ic: 'text-brand'      },
  { id: 'ar',          name: 'Manutenção do Ar-condicionado',  desc: 'Higienização, carga de gás e filtros',        icon: Wind,     bg: 'bg-surface-3',   ic: 'text-brand'      },
  { id: 'outro',       name: 'Outro serviço',                  desc: 'Descreva o que seu veículo precisa',          icon: Plus,     bg: 'bg-surface-3',   ic: 'text-text-muted' },
];

function Step1({ selected, onSelect, onNext, descricao, onDescricao }: {
  selected: string; onSelect: (id: string) => void; onNext: () => void;
  descricao: string; onDescricao: (v: string) => void;
}) {
  const precisaDescrever = selected === 'outro' && descricao.trim().length < 3;
  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <p className="text-[13px] font-medium text-text-muted px-1">
        Selecione o serviço
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {SERVICES.map(({ id, name, desc, icon: Icon, bg, ic }) => {
        const sel = selected === id;
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(id)}
            className={clsx(
              'flex items-center gap-3.5 p-4 rounded-[22px] text-left transition-all duration-150',
              sel ? 'bg-white shadow-[0_0_0_1.5px_var(--brand),0_10px_24px_rgba(204,20,0,0.10)]' : 'glass hover:bg-white'
            )}
          >
            <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0', sel ? 'nav-raised !shadow-none' : 'bg-white', !sel && ic)}>
              <Icon size={21} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14.5px] text-text leading-tight">{name}</p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
            </div>
            <div className={clsx(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
              sel ? 'bg-brand border-brand' : 'border-border'
            )}>
              {sel && <Check size={11} strokeWidth={3} className="text-white" />}
            </div>
          </motion.button>
        );
      })}
      </div>
      {selected && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="descricao-servico" className="text-xs font-semibold text-text-muted px-0.5">
            {selected === 'outro' ? 'O que seu veículo precisa?' : 'Observações para a oficina (opcional)'}
          </label>
          <textarea id="descricao-servico" value={descricao} onChange={e => onDescricao(e.target.value)} rows={3}
            maxLength={500} placeholder={selected === 'outro' ? 'Ex.: barulho na suspensão dianteira' : 'Ex.: luz de injeção acesa'}
            className="w-full px-4 py-3 rounded-2xl border border-white bg-white/85 text-sm text-text outline-none focus:border-brand resize-none" />
        </div>
      )}
      <Button fullWidth size="lg" disabled={!selected || precisaDescrever} onClick={onNext} className="mt-1">
        Próximo: Escolher Data <ChevronRight size={17} />
      </Button>
    </div>
  );
}

/* ─── Calendar ──────────────────────────────────────────── */
const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function Step2({ oficinaDoc, selected, onSelect, onNext, onBack }: {
  oficinaDoc: string; selected: string; onSelect: (d: string) => void; onNext: () => void; onBack: () => void;
}) {
  const [view, setView] = useState(new Date());
  const y = view.getFullYear(), m = view.getMonth();

  const { data: avail, isLoading } = useQuery({
    queryKey: ['availability', oficinaDoc, y, m + 1],
    queryFn: () => availabilityApi.getDays(y, m + 1, oficinaDoc || undefined).then(r => r.data.available_dates),
    staleTime: 60_000,
  });

  const availSet = new Set(avail || []);
  const firstDow = getDay(startOfMonth(view));
  const days     = getDaysInMonth(view);
  const today    = new Date(); today.setHours(0,0,0,0);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="glass rounded-[24px] overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setView(subMonths(view, 1))}
            className="chip w-9 h-9 flex items-center justify-center rounded-full text-brand"
          >
            <ChevronLeft size={19} />
          </button>
          <span className="font-medium text-sm text-text">
            {MONTHS_PT[m]} {y}
          </span>
          <button
            onClick={() => setView(addMonths(view, 1))}
            className="chip w-9 h-9 flex items-center justify-center rounded-full text-brand"
          >
            <ChevronRight size={19} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {WEEKDAYS_SHORT.map(d => (
            <div key={d} className="text-center text-2xs font-medium text-text-subtle uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner className="text-brand" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 px-3 pb-4">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dt = new Date(y, m, day);
              const past   = dt < today;
              const isAvail= availSet.has(dateStr) && !past;
              const isSel  = selected === dateStr;
              const isToday= dt.getTime() === today.getTime();
              return (
                <button
                  key={day}
                  disabled={!isAvail}
                  onClick={() => onSelect(dateStr)}
                  className={clsx(
                    'w-full aspect-square rounded-full text-[13px] transition-all duration-100 flex items-center justify-center',
                    isSel    ? 'nav-raised !shadow-[0_6px_14px_rgba(204,20,0,0.3)] font-medium' :
                    isAvail  ? 'text-text bg-white/70 hover:bg-white font-medium' :
                               'text-text-ghost cursor-not-allowed',
                    isToday && !isSel && 'ring-2 ring-inset ring-brand/20'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-1">
        {[['bg-brand','Selecionado'], ['bg-ok-mid','Disponível'], ['bg-border','Indisponível']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5 text-xs text-text-muted">
            <div className={`w-2.5 h-2.5 rounded-full ${c}`} />
            {l}
          </div>
        ))}
      </div>

      <Button fullWidth size="lg" disabled={!selected} onClick={onNext}>
        Próximo: Escolher Horário <ChevronRight size={17} />
      </Button>
      <Button fullWidth variant="ghost" onClick={onBack}>Voltar</Button>
    </div>
  );
}

/* ─── Time Slots ────────────────────────────────────────── */
// A API devolve "HH:MM:SS"; mostramos e enviamos "HH:MM". Só aparecem os horários
// que a oficina abriu (antes era uma lista fixa que nunca batia com a API).
const hhmm = (t: string) => t.slice(0, 5);

function Step3({ oficinaDoc, date, selected, onSelect, onNext, onBack }: {
  oficinaDoc: string; date: string; selected: string; onSelect: (t: string) => void; onNext: () => void; onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['availability-times', oficinaDoc, date],
    queryFn: () => availabilityApi.getTimes(date, oficinaDoc || undefined).then(r => r.data),
    enabled: !!date,
  });

  const horarios = Array.from(new Set((data?.times || []).map(hhmm))).sort();
  const dateLabel = date
    ? format(new Date(date + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })
    : '';

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Date display */}
      <div className="glass rounded-[22px] px-4 py-3">
        <p className="text-2xs font-medium text-text-subtle uppercase tracking-widest mb-0.5">Data</p>
        <p className="font-medium text-sm text-text capitalize">{dateLabel}</p>
      </div>

      <div>
        <p className="text-[13px] font-medium text-text-muted mb-3 px-1">
          Horários disponíveis
        </p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        ) : horarios.length === 0 ? (
          <p className="text-sm text-text-muted px-0.5">Não há horários livres neste dia. Volte e escolha outra data.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {horarios.map(slot => {
              const isSel = selected === slot;
              return (
                <button
                  key={slot}
                  onClick={() => onSelect(slot)}
                  aria-pressed={isSel}
                  className={clsx(
                    'h-12 rounded-full text-sm font-medium transition-all duration-100 tabular',
                    isSel ? 'chip chip-active' : 'chip text-text'
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button fullWidth size="lg" disabled={!selected} onClick={onNext}>
        Próximo: Confirmar <ChevronRight size={17} />
      </Button>
      <Button fullWidth variant="ghost" onClick={onBack}>Voltar</Button>
    </div>
  );
}

/* ─── Confirm ───────────────────────────────────────────── */
function Step4({ vehicleId, serviceType, descricao, oficinaNome, date, timeSlot, onBack, onConfirm, loading }: {
  vehicleId: string; serviceType: string; descricao: string; oficinaNome: string; date: string; timeSlot: string;
  onBack: () => void; onConfirm: () => void; loading: boolean;
}) {
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });
  const vehicle = vehicles.find(v => v.id === vehicleId) ?? vehicles[0];
  const serviceName = SERVICES.find(s => s.id === serviceType)?.name ?? serviceType;
  const dateLabel = date
    ? format(new Date(date + 'T00:00:00'), "EEE, d 'de' MMM 'de' yyyy", { locale: ptBR })
    : '';

  const rows = [
    { l: 'Veículo',  v: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : '—' },
    { l: 'Serviço',  v: serviceName },
    ...(descricao.trim() ? [{ l: 'Detalhes', v: descricao.trim() }] : []),
    { l: 'Data',     v: <span className="capitalize tabular">{dateLabel}</span> },
    { l: 'Horário',  v: <span className="tabular">{timeSlot}</span> },
    { l: 'Oficina',  v: oficinaNome || '—' },
  ];

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Hero check */}
      <div className="flex flex-col items-center py-4 gap-2 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 }}
          className="glass w-16 h-16 rounded-full flex items-center justify-center"
        >
          <Check size={30} className="text-ok" strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="font-medium text-base text-text">Tudo pronto!</p>
          <p className="text-sm text-text-muted mt-0.5">Revise os detalhes e confirme</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="glass rounded-[24px] overflow-hidden">
        {rows.map(({ l, v }) => (
          <div key={l} className="flex items-center justify-between px-4 py-3.5 border-b border-black/5 last:border-0">
            <span className="text-sm text-text-muted">{l}</span>
            <span className="text-sm font-medium text-text text-right max-w-[55%] leading-snug">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-text-muted">Status</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium
                           bg-warn-bg text-warn border border-warn-border">
            <span className="w-1.5 h-1.5 rounded-full bg-warn-mid" />
            Aguardando aprovação
          </span>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass flex items-start gap-3 rounded-[22px] p-4">
        <div className="w-1.5 flex-shrink-0 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-info" />
        </div>
        <p className="text-xs text-info leading-relaxed">
          A oficina recebe o seu pedido e confirma o horário. Você é avisado aqui no app
          quando ela responder.
        </p>
      </div>

      <Button fullWidth size="lg" loading={loading} onClick={onConfirm} className="mt-1">
        <Check size={17} /> Confirmar agendamento
      </Button>
      <Button fullWidth variant="ghost" onClick={onBack}>Voltar e editar</Button>
    </div>
  );
}

/* ─── Schedule Screen ───────────────────────────────────── */
export function ScheduleScreen() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [params]  = useSearchParams();
  const [step, setStep]         = useState<1|2|3|4>(1);
  const [vehicleId, setVehicleId] = useState('');
  const [service, setService]   = useState('');
  const [descricao, setDescricao] = useState('');
  const [date, setDate]         = useState('');
  const [time, setTime]         = useState('');
  const [oficinaDoc, setOficinaDoc] = useState(params.get('oficina') || '');

  const { data: oficinas = [], isLoading: carregandoOficinas } = useQuery({
    queryKey: ['oficinas'],
    queryFn: () => oficinasApi.list().then(r => r.data),
    staleTime: 60_000,
  });
  // Uma oficina só: escolhida sozinha. Oficina da URL que não é do cliente: ignorada.
  useEffect(() => {
    if (!oficinas.length) return;
    if (!oficinas.some(o => o.oficina_doc === oficinaDoc)) {
      setOficinaDoc(oficinas.length === 1 ? oficinas[0].oficina_doc : '');
    }
  }, [oficinas, oficinaDoc]);
  const oficina = oficinas.find(o => o.oficina_doc === oficinaDoc);
  // Trocar de oficina muda a agenda: data e horário escolhidos deixam de valer.
  const escolherOficina = (doc: string) => { setOficinaDoc(doc); setDate(''); setTime(''); if (step > 1) setStep(1); };

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => appointmentsApi.create({
      vehicle_id: vehicleId, service_type: service,
      service_description: descricao.trim() || undefined,
      date, time_slot: time, oficina_doc: oficinaDoc,
    }),
    onSuccess: () => {
      toast.success('Agendamento enviado! Aguarde a confirmação.');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/');
    },
    onError: (err: any) => {
      const d = err.response?.data;
      toast.error(d?.detail || d?.oficina_doc || (d && Object.values(d).flat()[0]) || 'Não foi possível agendar');
    },
  });

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit:  (dir: number) => ({ opacity: 0, x: dir * -24 }),
  };
  const [dir, setDir] = useState(1);

  const goTo = (s: 1|2|3|4, direction = 1) => {
    setDir(direction);
    setStep(s);
  };

  return (
    <MainLayout topbar={<Topbar title="Agendar Manutenção" showBack />}>
      <StepProgress current={step} />
      {carregandoOficinas ? (
        <div className="flex justify-center py-10"><Spinner className="text-brand" /></div>
      ) : oficinas.length === 0 ? (
        <SemOficina />
      ) : (
      <>
      <VehiclePicker selected={vehicleId} onSelect={setVehicleId} />
      <OficinaPicker oficinas={oficinas} selected={oficinaDoc} onSelect={escolherOficina} />

      {!oficinaDoc ? (
        <p className="mx-4 mt-4 text-sm text-text-muted">Escolha a oficina para ver os horários.</p>
      ) : (
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {step === 1 && <Step1 selected={service} onSelect={setService} onNext={() => goTo(2)}
                                descricao={descricao} onDescricao={setDescricao} />}
          {step === 2 && <Step2 oficinaDoc={oficinaDoc} selected={date} onSelect={(d) => { setDate(d); setTime(''); }}
                                onNext={() => goTo(3)} onBack={() => goTo(1,-1)} />}
          {step === 3 && <Step3 oficinaDoc={oficinaDoc} date={date} selected={time} onSelect={setTime}
                                onNext={() => goTo(4)} onBack={() => goTo(2,-1)} />}
          {step === 4 && (
            <Step4
              vehicleId={vehicleId} serviceType={service} descricao={descricao} oficinaNome={oficina?.nome ?? ''}
              date={date} timeSlot={time}
              onBack={() => goTo(3,-1)} onConfirm={() => create()} loading={isPending || !vehicleId}
            />
          )}
        </motion.div>
      </AnimatePresence>
      )}
      </>
      )}
    </MainLayout>
  );
}
