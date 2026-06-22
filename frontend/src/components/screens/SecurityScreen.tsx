import { useState } from 'react';
import { Smartphone, Fingerprint, Monitor, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD, SectionLabel, CardGroup, ToggleRow, PrimaryBtn } from '../ui/pro';

const SESSIONS = [
  { device: 'iPhone 14 · São Paulo', current: true,  icon: Smartphone },
  { device: 'Chrome · Windows',      current: false, icon: Monitor },
];

export function SecurityScreen() {
  const [pw, setPw] = useState({ atual: '', nova: '', conf: '' });
  const [twoFa, setTwoFa] = useState(false);
  const [bio, setBio] = useState(true);

  const field = (k: keyof typeof pw, label: string) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>{label}</label>
      <input type="password" value={pw[k]} placeholder="••••••••"
        onChange={e => setPw(s => ({ ...s, [k]: e.target.value }))}
        className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
        style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
    </div>
  );

  const canSave = pw.atual && pw.nova.length >= 8 && pw.nova === pw.conf;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Segurança" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div>
          <SectionLabel>Alterar senha</SectionLabel>
          <div className="rounded-[16px] p-4 flex flex-col gap-3.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {field('atual', 'Senha atual')}
            {field('nova', 'Nova senha')}
            {field('conf', 'Confirmar nova senha')}
            {pw.nova && pw.nova.length < 8 && (
              <p className="text-[11px]" style={{ color: C.brand }}>Mínimo de 8 caracteres</p>
            )}
            {pw.conf && pw.nova !== pw.conf && (
              <p className="text-[11px]" style={{ color: C.brand }}>As senhas não coincidem</p>
            )}
            <PrimaryBtn disabled={!canSave}
              onClick={() => { toast.success('Senha alterada!'); setPw({ atual:'', nova:'', conf:'' }); }}>
              Salvar nova senha
            </PrimaryBtn>
          </div>
        </div>

        <div>
          <SectionLabel>Proteção extra</SectionLabel>
          <CardGroup>
            <ToggleRow icon={<Smartphone size={18} />} label="Verificação em 2 etapas"
                       desc="Código por SMS ao entrar" on={twoFa} onChange={() => setTwoFa(!twoFa)} />
            <ToggleRow icon={<Fingerprint size={18} />} label="Entrar com biometria"
                       desc="Face ID / impressão digital" on={bio} onChange={() => setBio(!bio)} last />
          </CardGroup>
        </div>

        <div>
          <SectionLabel>Sessões ativas</SectionLabel>
          <CardGroup>
            {SESSIONS.map((s, i) => (
              <div key={s.device} className="flex items-center gap-3.5 px-4 py-3.5"
                   style={{ borderBottom: i === SESSIONS.length - 1 ? 'none' : `1px solid ${C.borderSoft}` }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
                  <s.icon size={18} color={C.muted} />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold" style={{ color: C.text }}>{s.device}</p>
                  <p className="text-[11px]" style={{ color: s.current ? C.green : C.subtle }}>
                    {s.current ? 'Este dispositivo' : 'Ativo há 2 dias'}
                  </p>
                </div>
                {!s.current && (
                  <button onClick={() => toast.success('Sessão encerrada')}>
                    <LogOut size={17} color={C.subtle} />
                  </button>
                )}
              </div>
            ))}
          </CardGroup>
        </div>

      </div>
    </MainLayout>
  );
}
