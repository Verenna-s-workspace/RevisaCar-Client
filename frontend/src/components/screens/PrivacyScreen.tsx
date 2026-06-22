import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, MapPin, Eye, Download, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { MainLayout, Topbar } from '../layout';
import { C, SectionLabel, CardGroup, MenuRow, ToggleRow } from '../ui/pro';

export function PrivacyScreen() {
  const navigate = useNavigate();
  const [p, setP] = useState({ uso: true, local: true, perfil: false });
  const t = (k: keyof typeof p) => setP(s => ({ ...s, [k]: !s[k] }));

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Privacidade" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div>
          <SectionLabel>Seus dados</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<BarChart3 size={18} />} label="Dados de uso"
                       desc="Ajuda a melhorar o app de forma anônima" on={p.uso} onChange={() => t('uso')} />
            <ToggleRow icon={<MapPin size={18} />} label="Localização"
                       desc="Sugerir oficinas próximas" on={p.local} onChange={() => t('local')} />
            <ToggleRow icon={<Eye size={18} />} label="Perfil visível p/ oficinas"
                       desc="Permite que oficinas vejam seu histórico" on={p.perfil} onChange={() => t('perfil')} last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Gerenciar</SectionLabel>
          <CardGroup>
            <MenuRow icon={<Download size={18} />} label="Baixar meus dados"
                     onClick={() => toast.success('Enviaremos seus dados por e-mail')} />
            <MenuRow icon={<FileText size={18} />} label="Política de Privacidade" last
                     onClick={() => navigate('/politica')} />
          </CardGroup>
        </div>

        <CardGroup>
          <MenuRow icon={<Trash2 size={18} color={C.brand} />} iconBg={C.redBg}
                   label="Excluir minha conta" danger last onClick={() => navigate('/excluir-conta')} />
        </CardGroup>

      </div>
    </MainLayout>
  );
}
