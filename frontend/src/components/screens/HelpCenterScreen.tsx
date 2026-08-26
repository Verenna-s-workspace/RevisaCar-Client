import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, MessageCircle, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD, SectionLabel, CardGroup } from '../ui/pro';
import { SHOWCASE } from '../../config/features';

const FAQ = [
  { q: 'Como agendar uma manutenção?', a: 'Na tela inicial, toque em "Agendar", escolha o serviço, a data e o horário disponível. A oficina confirma em até 24h.' },
  { q: 'O que é a Saúde do Veículo?', a: 'É uma pontuação de 0 a 100 calculada a partir dos sistemas monitorados (óleo, freios, pneus, bateria) e da sua quilometragem.' },
  { q: 'Como funciona o Passe do Veículo (QR)?', a: 'Apresente o QR Code na oficina para um atendimento rápido. Ele contém os dados do seu veículo de forma segura e validada.' },
  { q: 'Posso recusar um orçamento?', a: 'Sim. Em "Orçamentos", abra os detalhes e toque em "Recusar". A oficina é notificada automaticamente.' },
  { q: 'Como ganho pontos no Clube?', a: 'Você acumula pontos a cada serviço concluído e ao indicar amigos. Troque por serviços grátis no RevisaCar Clube.' },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="flex-1 text-[13.5px] font-semibold" style={{ color: C.text }}>{q}</span>
        <ChevronDown size={18} color={C.subtle}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <p className="px-4 pb-4 -mt-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>{a}</p>
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
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[13px]"
             style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <Search size={18} color={C.subtle} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar ajuda..."
            className="flex-1 text-[13.5px] outline-none bg-transparent" style={{ color: C.text }} />
        </div>

        {/* Contact */}
        <div className={`grid gap-3 ${SHOWCASE ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {[
            // Chat com a oficina ainda não tem backend → só em modo showcase.
            ...(SHOWCASE ? [{ icon: MessageCircle, label: 'Chat', bg: C.redBg, ic: C.brand, act: () => navigate('/chat') }] : []),
            { icon: Phone, label: 'Telefone', bg: C.greenBg, ic: C.greenDk, act: () => toast('0800 123 4567', { icon: '📞' }) },
            { icon: Mail, label: 'E-mail', bg: C.infoBg, ic: C.info, act: () => toast('ajuda@revisacar.com', { icon: '✉️' }) },
          ].map(c => (
            <button key={c.label} onClick={c.act}
              className="flex flex-col items-center gap-2 py-4 rounded-[14px]"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="w-11 h-11 rounded-[12px] flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={20} color={c.ic} />
              </div>
              <span className="text-[12px] font-semibold" style={{ color: C.text }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <SectionLabel>Perguntas frequentes</SectionLabel>
          <CardGroup>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px]" style={{ color: C.subtle }}>
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
