import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Globe, Bell, Shield, Lock, FileText, Info, Trash2 } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';
import { C, SectionLabel, CardGroup, MenuRow, ToggleRow } from '../ui/pro';

export function SettingsScreen() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Ajustes" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div>
          <SectionLabel>Preferências</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<Moon size={18} />} label="Tema escuro"
                       desc="Em breve disponível" on={dark} onChange={() => setDark(!dark)} />
            <MenuRow icon={<Globe size={18} />} label="Idioma" value="Português" last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Conta</SectionLabel>
          <CardGroup>
            <MenuRow icon={<Bell size={18} />} label="Notificações" onClick={() => navigate('/preferencias')} />
            <MenuRow icon={<Shield size={18} />} label="Segurança" onClick={() => navigate('/seguranca')} />
            <MenuRow icon={<Lock size={18} />} label="Privacidade" last onClick={() => navigate('/privacidade')} />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Sobre</SectionLabel>
          <CardGroup>
            <MenuRow icon={<FileText size={18} />} label="Termos e políticas" onClick={() => navigate('/termos')} />
            <MenuRow icon={<Info size={18} />} label="Versão do app" value="1.0.0" last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Zona de perigo</SectionLabel>
          <CardGroup>
            <MenuRow icon={<Trash2 size={18} color={C.brand} />} iconBg={C.redBg}
                     label="Excluir minha conta" danger last onClick={() => navigate('/excluir-conta')} />
          </CardGroup>
        </div>

      </div>
    </MainLayout>
  );
}
