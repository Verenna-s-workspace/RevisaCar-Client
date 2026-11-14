import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { profileApi, accountApi } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { C, SectionLabel, CardGroup, PrimaryBtn, OutlineBtn } from '../ui/pro';

type Erro = AxiosError<{ detail?: string; new_password?: string[]; old_password?: string[]; non_field_errors?: string[] }>;

function mensagem(e: unknown, padrao: string) {
  const d = (e as Erro)?.response?.data;
  return d?.detail || d?.new_password?.[0] || d?.old_password?.[0] || d?.non_field_errors?.[0] || padrao;
}

/** Linha de formulário agrupado (iOS): rótulo à esquerda, campo à direita. */
function CampoSenha({ id, label, value, onChange, autoComplete, last }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; last?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 pl-4 min-h-[44px]">
      <span className="t-body w-[104px] flex-none" style={{ color: C.text }}>{label}</span>
      <input id={id} type="password" value={value} placeholder="Obrigatório" autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 t-body bg-transparent outline-none py-[11px] pr-4"
        style={{ color: C.text, boxShadow: last ? 'none' : `0 0.5px 0 ${C.border}` }} />
    </label>
  );
}

function SairDeTodosSheet({ onClose }: { onClose: () => void }) {
  const [senha, setSenha] = useState('');
  const { mutate, isPending } = useMutation({
    mutationFn: () => accountApi.logoutAll(senha),
    onSuccess: () => { toast.success('Pronto: só este aparelho continua conectado'); onClose(); },
    onError: (e) => toast.error(mensagem(e, 'Não foi possível encerrar as sessões')),
  });
  return (
    <BottomSheet onClose={onClose} title="Sair dos outros aparelhos">
      <form className="flex flex-col gap-4 pt-2" onSubmit={e => { e.preventDefault(); if (senha) mutate(); }}>
        <p className="text-[0.8125rem] leading-relaxed" style={{ color: C.muted }}>
          Todos os outros celulares e computadores conectados à sua conta vão precisar entrar de novo.
          Este aparelho continua conectado.
        </p>
        <CardGroup><CampoSenha id="senha-sair" label="Senha" value={senha} onChange={setSenha} autoComplete="current-password" last /></CardGroup>
        <PrimaryBtn type="submit" disabled={!senha || isPending}>{isPending ? 'Encerrando…' : 'Encerrar outras sessões'}</PrimaryBtn>
        <OutlineBtn onClick={onClose}>Cancelar</OutlineBtn>
      </form>
    </BottomSheet>
  );
}

export function SecurityScreen() {
  const [pw, setPw] = useState({ atual: '', nova: '', conf: '' });
  const [sairTodos, setSairTodos] = useState(false);

  const { mutate: trocar, isPending } = useMutation({
    mutationFn: () => profileApi.changePassword({ old_password: pw.atual, new_password: pw.nova, new_password_confirm: pw.conf }),
    onSuccess: () => {
      toast.success('Senha alterada. Os outros aparelhos vão precisar entrar de novo.');
      setPw({ atual: '', nova: '', conf: '' });
    },
    onError: (e) => toast.error(mensagem(e, 'Não foi possível alterar a senha')),
  });

  const canSave = pw.atual && pw.nova.length >= 8 && pw.nova === pw.conf && !isPending;

  return (
    <>
      <MainLayout showNav={false} topbar={<Topbar title="Segurança" showBack />}>
        <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

          <form onSubmit={e => { e.preventDefault(); if (canSave) trocar(); }}>
            <SectionLabel>Alterar senha</SectionLabel>
            <CardGroup>
              <CampoSenha id="senha-atual" label="Atual" value={pw.atual} autoComplete="current-password"
                onChange={v => setPw(s => ({ ...s, atual: v }))} />
              <CampoSenha id="senha-nova" label="Nova" value={pw.nova} autoComplete="new-password"
                onChange={v => setPw(s => ({ ...s, nova: v }))} />
              <CampoSenha id="senha-conf" label="Confirmar" value={pw.conf} autoComplete="new-password" last
                onChange={v => setPw(s => ({ ...s, conf: v }))} />
            </CardGroup>
            <p className="t-footnote px-4 mt-1.5" role="status"
               style={{ color: (pw.nova && pw.nova.length < 8) || (pw.conf && pw.nova !== pw.conf) ? 'var(--red)' : C.subtle }}>
              {pw.nova && pw.nova.length < 8 ? 'A nova senha precisa de pelo menos 8 caracteres.'
                : pw.conf && pw.nova !== pw.conf ? 'As senhas não coincidem.'
                : 'Ao trocar a senha, os outros aparelhos precisam entrar de novo.'}
            </p>
            <div className="mt-4"><PrimaryBtn type="submit" disabled={!canSave}>{isPending ? 'Salvando…' : 'Salvar nova senha'}</PrimaryBtn></div>
          </form>

          <div>
            <SectionLabel>Aparelhos conectados</SectionLabel>
            <div className="rounded-2xl p-4 flex flex-col gap-3 glass">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: C.bg }}>
                  <MonitorSmartphone size={18} color={C.muted} />
                </div>
                <p className="text-[0.8125rem] leading-relaxed" style={{ color: C.muted }}>
                  Esqueceu a conta aberta em outro aparelho ou acha que alguém entrou nela?
                  Encerre todas as outras sessões. Trocar a senha também faz isso.
                </p>
              </div>
              <OutlineBtn onClick={() => setSairTodos(true)}>Sair de todos os outros aparelhos</OutlineBtn>
            </div>
          </div>

        </div>
      </MainLayout>
      {sairTodos && <SairDeTodosSheet onClose={() => setSairTodos(false)} />}
    </>
  );
}
