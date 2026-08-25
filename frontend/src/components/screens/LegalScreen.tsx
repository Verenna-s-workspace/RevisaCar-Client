import { useLocation } from 'react-router-dom';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD } from '../ui/pro';

const TERMS = {
  title: 'Termos de Uso',
  updated: 'Atualizado em 01/06/2026',
  sections: [
    { h: '1. Aceitação dos termos', b: 'Ao criar uma conta ou usar o RevisaCar, você declara ter lido e concordado com estes Termos de Uso e com a Política de Privacidade. Caso não concorde, não utilize o aplicativo.' },
    { h: '2. Uso do serviço', b: 'O RevisaCar conecta proprietários de veículos a oficinas parceiras para agendamento, acompanhamento e histórico de manutenções. Você se compromete a fornecer informações verdadeiras e a manter seus dados atualizados.' },
    { h: '3. Elegibilidade', b: 'O uso é destinado a maiores de 18 anos ou menores devidamente representados por seus responsáveis legais. Ao usar o app, você declara atender a esse requisito.' },
    { h: '4. Conta e segurança', b: 'Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta. Notifique-nos imediatamente em caso de uso não autorizado.' },
    { h: '5. Orçamentos e pagamentos', b: 'Os orçamentos, preços e a execução dos serviços são de responsabilidade das oficinas parceiras. O RevisaCar atua como intermediário tecnológico e não presta serviços automotivos.' },
    { h: '6. Condutas proibidas', b: 'É vedado usar o app para fins ilícitos, inserir dados falsos, violar direitos de terceiros ou tentar comprometer a segurança da plataforma.' },
    { h: '7. Limitação de responsabilidade', b: 'O RevisaCar não se responsabiliza por danos decorrentes de serviços prestados por oficinas parceiras nem por indisponibilidades temporárias alheias ao nosso controle.' },
    { h: '8. Cancelamento', b: 'Você pode encerrar sua conta a qualquer momento em Perfil > Segurança > Excluir conta. Podemos suspender contas que violem estes termos.' },
    { h: '9. Alterações e foro', b: 'Estes termos podem ser atualizados; avisaremos sobre mudanças relevantes. Aplica-se a legislação brasileira, elegendo-se o foro do domicílio do consumidor.' },
  ],
};

const PRIVACY = {
  title: 'Política de Privacidade',
  updated: 'Atualizado em 01/06/2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)',
  sections: [
    { h: '1. Controlador dos dados', b: 'O RevisaCar é o controlador dos seus dados pessoais. Encarregado pela Proteção de Dados (DPO): privacidade@revisacar.com. Use este canal para exercer seus direitos ou tirar dúvidas.' },
    { h: '2. Dados que coletamos', b: 'Dados cadastrais (nome, e-mail, telefone, CPF quando informado); dados dos veículos (placa, modelo, quilometragem, documentos); histórico de serviços e orçamentos; e dados técnicos de uso do app (dispositivo, logs de acesso).' },
    { h: '3. Base legal (Art. 7 e 11 da LGPD)', b: 'Tratamos seus dados para: execução do contrato (prestar o serviço), cumprimento de obrigação legal, legítimo interesse (segurança e melhoria) e, quando aplicável, com base no seu consentimento — que pode ser revogado a qualquer momento.' },
    { h: '4. Finalidades', b: 'Fornecer o serviço, calcular a saúde do veículo, gerar lembretes de manutenção, intermediar agendamentos com oficinas e melhorar a experiência. Não usamos seus dados para decisões automatizadas com efeitos jurídicos.' },
    { h: '5. Compartilhamento', b: 'Compartilhamos dados com a oficina parceira apenas quando você agenda ou autoriza um serviço, e com operadores de infraestrutura (hospedagem, e-mail) estritamente para operar o app. Nunca vendemos seus dados.' },
    { h: '6. Transferência internacional', b: 'Parte da infraestrutura de nuvem pode processar dados em servidores localizados fora do Brasil. Nesses casos, adotamos salvaguardas contratuais e técnicas exigidas pela LGPD para proteger seus dados.' },
    { h: '7. Retenção e eliminação', b: 'Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, eliminamos os dados pessoais em até 30 dias, salvo quando a retenção for exigida por obrigação legal ou regulatória.' },
    { h: '8. Segurança', b: 'Senhas são armazenadas com hash e o acesso é protegido por autenticação com tokens. Adotamos criptografia em trânsito e controles de acesso conforme as melhores práticas.' },
    { h: '9. Seus direitos (Art. 18 da LGPD)', b: 'Você pode confirmar o tratamento, acessar, corrigir, anonimizar, portar ou excluir seus dados, além de revogar consentimentos. Exerça-os em Perfil > Privacidade ou pelo e-mail do Encarregado.' },
    { h: '10. Dados de menores', b: 'O app não é direcionado a menores de 18 anos sem a representação de responsáveis. Se identificarmos coleta indevida, eliminaremos os dados.' },
    { h: '11. Autoridade Nacional (ANPD)', b: 'Você tem o direito de peticionar, a qualquer momento, à Autoridade Nacional de Proteção de Dados (ANPD) caso entenda que seus direitos não foram atendidos.' },
    { h: '12. Alterações', b: 'Podemos atualizar esta política. Mudanças relevantes serão comunicadas no app. A data de atualização consta no topo desta página.' },
  ],
};

export function LegalScreen() {
  const { pathname } = useLocation();
  const doc = pathname.includes('politica') ? PRIVACY : TERMS;

  return (
    <MainLayout showNav={false} topbar={<Topbar title={doc.title} showBack />}>
      <div className="px-4 pt-4 pb-10 flex flex-col gap-4">
        <p className="text-[12px]" style={{ color: C.subtle }}>{doc.updated}</p>
        {doc.sections.map(s => (
          <div key={s.h}>
            <h2 className="text-[14px] font-bold mb-1.5" style={{ color: C.text, fontFamily: FONT_HEAD }}>{s.h}</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>{s.b}</p>
          </div>
        ))}
        <p className="text-[12px] leading-relaxed mt-2 pt-4" style={{ color: C.subtle, borderTop: `1px solid ${C.borderSoft}` }}>
          Em caso de dúvidas, fale com a gente em ajuda@revisacar.com.
        </p>
      </div>
    </MainLayout>
  );
}
