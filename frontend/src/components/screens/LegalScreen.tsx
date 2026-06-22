import { useLocation } from 'react-router-dom';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD } from '../ui/pro';

const TERMS = {
  title: 'Termos de Uso',
  updated: 'Atualizado em 01/06/2026',
  sections: [
    { h: '1. Aceitação dos termos', b: 'Ao usar o RevisaCar, você concorda com estes Termos de Uso. Caso não concorde, não utilize o aplicativo.' },
    { h: '2. Uso do serviço', b: 'O RevisaCar conecta proprietários de veículos a oficinas parceiras para agendamento, acompanhamento e histórico de manutenções. Você se compromete a fornecer informações verdadeiras.' },
    { h: '3. Conta e segurança', b: 'Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta.' },
    { h: '4. Orçamentos e pagamentos', b: 'Os orçamentos são de responsabilidade das oficinas parceiras. O RevisaCar atua como intermediário e não se responsabiliza pela execução dos serviços.' },
    { h: '5. Limitação de responsabilidade', b: 'O RevisaCar não se responsabiliza por danos decorrentes do uso de serviços prestados por oficinas parceiras.' },
  ],
};

const PRIVACY = {
  title: 'Política de Privacidade',
  updated: 'Atualizado em 01/06/2026',
  sections: [
    { h: '1. Dados que coletamos', b: 'Coletamos dados cadastrais (nome, e-mail, telefone), dados dos veículos (placa, modelo, quilometragem) e histórico de serviços.' },
    { h: '2. Como usamos', b: 'Usamos seus dados para fornecer o serviço, calcular a saúde do veículo, enviar lembretes e melhorar a experiência no app.' },
    { h: '3. Compartilhamento', b: 'Compartilhamos dados com oficinas parceiras apenas quando você agenda um serviço. Nunca vendemos seus dados.' },
    { h: '4. Seus direitos (LGPD)', b: 'Você pode acessar, corrigir, exportar ou excluir seus dados a qualquer momento em Privacidade > Gerenciar.' },
    { h: '5. Segurança', b: 'Seus dados são armazenados de forma criptografada e protegidos conforme as melhores práticas de mercado.' },
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
