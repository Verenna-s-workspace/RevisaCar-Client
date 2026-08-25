import { MainLayout, Topbar } from '../layout';

const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';
const GREEN  = '#18B26B';
const BRAND  = '#CC1400';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun'];
const VALUES = [310, 160, 0, 250, 420, 0];
const MAX = Math.max(...VALUES, 1);

// Escala monocromática da marca (sem azul/amarelo destoando).
const CATEGORIES = [
  { label: 'Motor e óleo',         value: 470, color: '#CC1400' },
  { label: 'Freios',               value: 420, color: '#E0644F' },
  { label: 'Pneus e alinhamento',  value: 250, color: '#F0A594' },
];
const TOTAL = CATEGORIES.reduce((a, c) => a + c.value, 0);

export function CostAnalysisScreen() {
  return (
    <MainLayout topbar={<Topbar title="Meus gastos" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">

        {/* Total card */}
        <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: SUBTLE }}>
            Total em 2024
          </p>
          <p className="text-[34px] font-black data-mono" style={{ color: TEXT }}>
            R$ {TOTAL.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
            <p className="text-[12px] font-medium" style={{ color: GREEN }}>
              12% abaixo da média
            </p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[13px] font-bold mb-4" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Por mês
          </p>
          <div className="flex items-end gap-2 h-[100px]">
            {MONTHS.map((m, i) => {
              const h = VALUES[i] ? Math.max((VALUES[i] / MAX) * 100, 8) : 6;
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t-[6px]"
                       style={{
                         height: `${h}%`,
                         background: VALUES[i] ? BRAND : BORDER,
                         minHeight: 6,
                       }} />
                  <p className="text-[10px] font-semibold" style={{ color: SUBTLE }}>{m}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-[18px] p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[13px] font-bold mb-4" style={{ color: TEXT, fontFamily: "var(--font-heading)" }}>
            Por categoria
          </p>
          <div className="flex flex-col gap-3">
            {CATEGORIES.map(c => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{c.label}</p>
                  </div>
                  <p className="text-[13px] font-bold data-mono" style={{ color: TEXT }}>
                    R$ {c.value.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: BG }}>
                  <div className="h-full rounded-full"
                       style={{ width: `${(c.value / TOTAL) * 100}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
