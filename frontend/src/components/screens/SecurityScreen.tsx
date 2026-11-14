import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { profileApi, accountApi } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { C, SectionLabel, PrimaryBtn, OutlineBtn } from '../ui/pro';

type Erro = AxiosError<{ detail?: string; new_password?: string[]; old_password?: string[]; non_field_errors?: string[] }>;

function mensagem(e: unknown, padrao: string) {
  const d = (e as Erro)?.response?.data;
  return d?.detail || d?.new_password?.[0] || d?.old_password?.[0] || d?.non_field_errors?.[0] || padrao;
}

function CampoSenha({ id, label, value, onChange, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11.5px] font-semibold" style={{ color: C.muted }}>{label}</label>
      <input id={id} type="password" value={value} placeholder="••••••••" autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
        style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
    </div>
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
        <p className="text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
          Todos os outros celulares e computadores conectados à sua conta vão precisar entrar de novo.
          Este aparelho continua conectado.
        </p>
        <CampoSenha id="senha-sair" label="Confirme sua senha" value={senha} onChange={setSenha} autoComplete="current-password" />
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
            <div className="rounded-[16px] p-4 flex flex-col gap-3.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <CampoSenha id="senha-atual" label="Senha atual" value={pw.atual} autoComplete="current-password"
                onChange={v => setPw(s => ({ ...s, atual: v }))} />
              <CampoSenha id="senha-nova" label="Nova senha" value={pw.nova} autoComplete="new-password"
                onChange={v => setPw(s => ({ ...s, nova: v }))} />
              <CampoSenha id="senha-conf" label="Confirmar nova senha" value={pw.conf} autoComplete="new-password"
                onChange={v => setPw(s => ({ ...s, conf: v }))} />
              {pw.nova && pw.nova.length < 8 && (
                <p className="text-[11px]" style={{ color: C.brand }}>Mínimo de 8 caracteres</p>
              )}
              {pw.conf && pw.nova !== pw.conf && (
                <p className="text-[11px]" style={{ color: C.brand }}>As senhas não coincidem</p>
              )}
              <PrimaryBtn type="submit" disabled={!canSave}>{isPending ? 'Salvando…' : 'Salvar nova senha'}</PrimaryBtn>
            </div>
          </form>

          <div>
            <SectionLabel>Aparelhos conectados</SectionLabel>
            <div className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none" style={{ background: C.bg }}>
                  <MonitorSmartphone size={18} color={C.muted} />
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>
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
