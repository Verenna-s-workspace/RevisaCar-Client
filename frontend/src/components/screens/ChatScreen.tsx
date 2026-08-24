import { useState } from 'react';
import { Send } from 'lucide-react';
import { MainLayout, Topbar } from '../layout';

const BRAND  = '#CC1400';
const TEXT   = '#14161A';
const MUTED  = '#6B7078';
const SUBTLE = '#9AA0A8';
const BG     = '#F7F6F3';
const CARD   = '#FFFFFF';
const BORDER = '#E2DFD8';

interface Msg { from: 'user' | 'shop'; text: string; time: string; }

const INITIAL: Msg[] = [
  { from: 'shop', text: 'Olá! 👋 Como podemos ajudar?', time: '09:32' },
  { from: 'user', text: 'Quero remarcar minha revisão.', time: '09:33' },
  { from: 'shop', text: 'Claro! Está marcada para 12/04 às 14:00. Para qual data deseja remarcar?', time: '09:33' },
];

export function ChatScreen() {
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    setMsgs(p => [...p, { from: 'user', text: text.trim(), time }]);
    setText('');
  };

  return (
    <MainLayout topbar={
      <Topbar
        title="RevisaCar · Centro"
        showBack
        right={
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#18B26B' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#18B26B' }}>Online</span>
          </div>
        }
      />
    }>
      <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 56px - 72px)' }}>

        {/* Messages */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
          <p className="text-center text-[11px] font-semibold py-1 px-3 rounded-full mx-auto"
             style={{ background: BG, color: SUBTLE }}>Hoje</p>

          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                <div className="px-4 py-2.5 rounded-[14px]"
                     style={{
                       background: m.from === 'user' ? BRAND : CARD,
                       color: m.from === 'user' ? '#fff' : TEXT,
                       borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                       border: m.from === 'shop' ? `1px solid ${BORDER}` : 'none',
                     }}>
                  <p className="text-[13.5px] font-medium leading-[1.4]">{m.text}</p>
                </div>
                <p className="text-[10px] mt-1 px-1" style={{ color: SUBTLE,
                   textAlign: m.from === 'user' ? 'right' : 'left' }}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 px-4 py-3 flex gap-2 items-center"
             style={{ background: '#fff', borderTop: `1px solid ${BORDER}` }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Mensagem..."
            className="flex-1 px-4 py-3 rounded-[12px] text-[14px] outline-none"
            style={{ background: BG, color: TEXT, border: `1px solid ${BORDER}` }}
          />
          <button
            onClick={send}
            className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-none"
            style={{ background: text.trim() ? BRAND : BG }}>
            <Send size={18} color={text.trim() ? '#fff' : SUBTLE} />
          </button>
        </div>

      </div>
    </MainLayout>
  );
}
