import { useState } from 'react';
import { Wrench, FileText, CalendarCheck, Tag, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';
import { SectionLabel, CardGroup, ToggleRow } from '../ui/pro';

export function NotificationPreferencesScreen() {
  const [p, setP] = useState({
    manutencao: true, orcamentos: true, agendamentos: true, promocoes: false,
    push: true, email: true, sms: false,
  });
  const t = (k: keyof typeof p) => setP(s => ({ ...s, [k]: !s[k] }));

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Notificações" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div>
          <SectionLabel>O que você recebe</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<Wrench size={18} />} label="Lembretes de manutenção"
                       desc="Avisos quando um serviço estiver próximo" on={p.manutencao} onChange={() => t('manutencao')} />
            <ToggleRow icon={<FileText size={18} />} label="Orçamentos"
                       desc="Quando a oficina enviar um orçamento" on={p.orcamentos} onChange={() => t('orcamentos')} />
            <ToggleRow icon={<CalendarCheck size={18} />} label="Agendamentos"
                       desc="Confirmações e mudanças de horário" on={p.agendamentos} onChange={() => t('agendamentos')} />
            <ToggleRow icon={<Tag size={18} />} label="Promoções e novidades"
                       desc="Ofertas das oficinas parceiras" on={p.promocoes} onChange={() => t('promocoes')} last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Como você recebe</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<Smartphone size={18} />} label="Push" on={p.push} onChange={() => t('push')} />
            <ToggleRow icon={<Mail size={18} />} label="E-mail" on={p.email} onChange={() => t('email')} />
            <ToggleRow icon={<MessageSquare size={18} />} label="SMS" on={p.sms} onChange={() => t('sms')} last />
          </CardGroup>
        </div>

      </div>
    </MainLayout>
  );
}
