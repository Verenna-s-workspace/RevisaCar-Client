import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, MessageCircle, Mail } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD, SectionLabel, CardGroup } from '../ui/pro';
import { SHOWCASE } from '../../config/features';

// E-mail de suporte (configurável no build). Telefone/WhatsApp entram quando existirem.
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'contato@revisacar.com';

const FAQ = [
  { q: 'Como entro na minha oficina?', a: 'Peça o convite à oficina (QR Code ou link). Abra o link, ou vá em Perfil → Minhas oficinas → "Tenho um convite" e cole o código. Ao entrar, você autoriza a oficina a ver seus dados para atender você.' },
  { q: 'Como agendar uma manutenção?', a: 'Toque em "Agendar", escolha o serviço, a data e um dos horários que a oficina abriu. A oficina confirma o pedido e você é avisado aqui no app.' },
  { q: 'Onde vejo os orçamentos?', a: 'Em "Orçamentos" aparecem os orçamentos que suas oficinas enviaram, com todos os itens. Para aprovar ou recusar, use o link que a oficina mandou para você ou fale direto com ela.' },
  { q: 'O que é a Saúde do Veículo?', a: 'É uma nota de 0 a 100 calculada a partir dos lembretes de manutenção do veículo: quanto mais serviços atrasados ou perto do prazo, menor a nota.' },
  { q: 'Como funciona o QR Code do veículo?', a: 'Mostre o QR Code na oficina para ela identificar o veículo rapidamente. Ele mostra só marca, modelo, ano, placa e cor — nada dos seus dados pessoais — e vale por 24 horas.' },
  { q: 'Como baixo ou apago meus dados?', a: 'Em Perfil → Privacidade você baixa um arquivo com todos os seus dados. Para apagar, use "Excluir minha conta".' },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="flex-1 text-[0.8125rem] font-semibold" style={{ color: C.text }}>{q}</span>
        <ChevronDown size={18} color={C.subtle}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <p className="px-4 pb-4 -mt-1 text-[0.75rem] leading-relaxed" style={{ color: C.muted }}>{a}</p>
      )}
    </div>
  );
}

export function HelpCenterScreen() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState('');

  const filtered = FAQ.filter(f => f.q.toLowerCase().includes(q.toLowerCase()));

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Ajuda e suporte" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        {/* Search */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl glass">
          <Search size={18} color={C.subtle} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar ajuda..."
            className="flex-1 text-[0.8125rem] outline-none bg-transparent" style={{ color: C.text }} />
        </div>

        {/* Contact */}
        <div className={`grid gap-3 ${SHOWCASE ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {[
            // Chat com a oficina ainda não tem backend → só em modo showcase.
            ...(SHOWCASE ? [{ icon: MessageCircle, label: 'Chat', bg: C.redBg, ic: C.brand, act: () => navigate('/chat') }] : []),
            { icon: Mail, label: 'Enviar e-mail', bg: C.infoBg, ic: C.info,
              act: () => { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ajuda — app RevisaCar')}`; } },
          ].map(c => (
            <button key={c.label} onClick={c.act}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl glass">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={20} color={c.ic} />
              </div>
              <span className="text-[0.75rem] font-semibold" style={{ color: C.text }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <SectionLabel>Perguntas frequentes</SectionLabel>
          <CardGroup>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[0.8125rem]" style={{ color: C.subtle }}>
                Nenhum resultado para "{q}".
              </p>
            ) : filtered.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </CardGroup>
        </div>

      </div>
    </MainLayout>
  );
}
