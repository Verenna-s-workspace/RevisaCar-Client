import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Download, FileText, Trash2, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { accountApi, baixarArquivo } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { C, SectionLabel, CardGroup, MenuRow } from '../ui/pro';

export function PrivacyScreen() {
  const navigate = useNavigate();

  // Portabilidade (LGPD art. 18, V): baixa na hora um JSON com todos os seus dados.
  const { mutate: exportar, isPending } = useMutation({
    mutationFn: () => accountApi.exportData(),
    onSuccess: (r) => {
      baixarArquivo(r.data, `revisacar-meus-dados-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success('Seus dados foram baixados');
    },
    onError: () => toast.error('Não foi possível gerar o arquivo agora'),
  });

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Privacidade" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div className="rounded-[22px] p-4 glass">
          <p className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>
            O RevisaCar não vende seus dados nem usa rastreamento de anúncios. As oficinas só veem
            seus dados depois que você entra nelas pelo convite.
          </p>
        </div>

        <div>
          <SectionLabel>Seus dados</SectionLabel>
          <CardGroup>
            <MenuRow icon={<Store size={18} />} label="Oficinas com acesso aos seus dados"
                     onClick={() => navigate('/oficinas')} />
            <MenuRow icon={<Download size={18} />} label={isPending ? 'Gerando arquivo…' : 'Baixar meus dados'}
                     onClick={() => { if (!isPending) exportar(); }} />
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
