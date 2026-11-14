import { Smartphone, Wrench, FileText, CalendarCheck } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';
import { C, SectionLabel, CardGroup, ToggleRow } from '../ui/pro';
import { usePush } from '../../hooks/usePush';

// Só há um ajuste real hoje: o push neste aparelho. Os avisos em si (agendamento,
// orçamento, lembrete) sempre aparecem em Notificações dentro do app.
const AVISOS = [
  { icon: CalendarCheck, label: 'Agendamentos', desc: 'Quando a oficina confirmar ou mudar um horário' },
  { icon: FileText, label: 'Orçamentos', desc: 'Quando uma oficina enviar um orçamento' },
  { icon: Wrench, label: 'Lembretes de manutenção', desc: 'Quando um serviço estiver perto do prazo' },
];

export function NotificationPreferencesScreen() {
  const push = usePush();
  const pushDesc = !push.available
    ? 'Indisponível neste navegador ou aparelho'
    : push.subscribed ? 'Ativado neste aparelho' : 'Receba os avisos mesmo com o app fechado';
  const togglePush = () => {
    if (push.busy || !push.available) return;
    if (push.subscribed) push.unsubscribe();
    else push.subscribe();
  };

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Notificações" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div>
          <SectionLabel>Neste aparelho</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<Smartphone size={18} />} label="Notificações push" desc={pushDesc}
                       on={push.subscribed} onChange={togglePush} last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Você é avisado sobre</SectionLabel>
          <CardGroup>
            {AVISOS.map((a, i) => (
              <div key={a.label} className="flex items-center gap-3.5 px-4 py-3.5"
                   style={{ borderBottom: i === AVISOS.length - 1 ? 'none' : `1px solid ${C.borderSoft}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: C.bg }}>
                  <a.icon size={18} color={C.muted} />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-semibold" style={{ color: C.text }}>{a.label}</p>
                  <p className="text-[0.75rem]" style={{ color: C.muted }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </CardGroup>
          <p className="text-[0.75rem] mt-2 px-1" style={{ color: C.subtle }}>
            Todos os avisos também ficam na tela Notificações.
          </p>
        </div>

      </div>
    </MainLayout>
  );
}
