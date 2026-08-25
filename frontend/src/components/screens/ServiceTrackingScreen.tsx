import { MessageCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, Topbar } from '../layout';

const BRAND  = '#CC1400';
const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';
const GREEN  = '#18B26B';

const STEPS = [
  { label: 'Veículo recebido',   time: '14:02', done: true  },
  { label: 'Inspeção inicial',   time: '14:20', done: true  },
  { label: 'Troca em execução',  time: 'Agora', done: false, current: true },
  { label: 'Pronto para retirada', time: '~15:30', done: false },
];

export function ServiceTrackingScreen() {
  const navigate = useNavigate();
  const progress = 66;

  return (
    <MainLayout topbar={<Topbar title="Acompanhar serviço" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">

        {/* OS header */}
        <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-semibold" style={{ color: SUBTLE }}>OS #1258 · HB20</p>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: '#FFF3D6', color: '#C98A00' }}>Em andamento</span>
          </div>
          <p className="font-bold text-[16px] mb-3" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Troca de óleo e filtros
          </p>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: BG }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${progress}%`, background: GREEN }} />
            </div>
            <span className="text-[13px] font-bold tabular" style={{ color: GREEN }}>{progress}%</span>
          </div>
          <p className="text-[11.5px] mt-2" style={{ color: SUBTLE }}>
            Previsão de conclusão · <span className="font-semibold">15:30</span>
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[13px] font-bold mb-4" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Progresso
          </p>
          <div className="flex flex-col gap-0">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Icon + connector */}
                <div className="flex flex-col items-center">
                  {step.done ? (
                    <CheckCircle2 size={20} color={GREEN} fill={GREEN} className="flex-none" />
                  ) : step.current ? (
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none"
                         style={{ borderColor: BRAND }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
                    </div>
                  ) : (
                    <Circle size={20} color={BORDER} className="flex-none" />
                  )}
                  {i < STEPS.length - 1 && (
                    <div className="w-0.5 h-8 mt-1 mb-1"
                         style={{ background: step.done ? GREEN : BORDER }} />
                  )}
                </div>
                {/* Content */}
                <div className="pb-4 flex-1 flex items-start justify-between">
                  <p className={`text-[13px] font-semibold ${step.current ? 'font-bold' : ''}`}
                     style={{ color: step.current ? TEXT : step.done ? MUTED : SUBTLE }}>
                    {step.label}
                  </p>
                  <p className="text-[11px] font-medium ml-2" style={{ color: step.current ? BRAND : SUBTLE }}>
                    {step.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat CTA */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full flex items-center justify-center gap-2 py-[13px] rounded-[12px] font-semibold text-[14px]"
          style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <MessageCircle size={18} color={MUTED} />
          Falar com a oficina
        </button>

      </div>
    </MainLayout>
  );
}
