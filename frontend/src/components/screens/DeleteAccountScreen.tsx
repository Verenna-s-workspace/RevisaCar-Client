import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { useAuthStore } from '../../store/auth';
import { accountApi } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { C, FONT_HEAD } from '../ui/pro';

// O que acontece de verdade (ver services.delete_customer_account no backend).
const LOSES = [
  'Seus dados pessoais (nome, e-mail, telefone, CPF e endereço) são apagados',
  'Documentos, lembretes, notificações e QR codes dos seus veículos são apagados',
  'Você sai de todas as oficinas e elas deixam de ver seus dados',
  'Você é desconectado de todos os aparelhos',
];

export function DeleteAccountScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { clearSession } = useAuthStore();
  const [confirm, setConfirm] = useState('');
  const [senha, setSenha] = useState('');
  const { mutate: excluir, isPending } = useMutation({
    mutationFn: () => accountApi.delete(senha),
    onSuccess: () => {
      clearSession();
      qc.clear();
      toast.success('Sua conta foi excluída');
      navigate('/login', { replace: true });
    },
    onError: (e) => toast.error((e as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Não foi possível excluir agora'),
  });
  const canDelete = confirm.trim().toUpperCase() === 'EXCLUIR' && senha.length > 0 && !isPending;

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Excluir conta" showBack />}>
      <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center" style={{ background: C.redBg }}>
            <AlertTriangle size={40} color={C.brand} strokeWidth={1.6} />
          </div>
          <h1 className="text-[20px] font-extrabold mt-5" style={{ color: C.text, fontFamily: FONT_HEAD }}>
            Tem certeza?
          </h1>
          <p className="text-[13.5px] leading-relaxed mt-2 px-2" style={{ color: C.muted }}>
            Esta ação é <span style={{ color: C.brand, fontWeight: 700 }}>permanente</span> e não pode ser desfeita.
          </p>
        </div>

        <div className="rounded-[16px] p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-[12px] font-bold uppercase tracking-wide mb-3" style={{ color: C.subtle }}>O que acontece</p>
          <div className="flex flex-col gap-2.5">
            {LOSES.map(l => (
              <div key={l} className="flex items-start gap-2.5">
                <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-none mt-0.5"
                     style={{ background: C.redBg }}>
                  <X size={11} color={C.brand} strokeWidth={3} />
                </div>
                <p className="text-[13px] leading-snug" style={{ color: C.text2 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[12.5px] mb-2" style={{ color: C.muted }}>
            Digite <span style={{ color: C.text, fontWeight: 700 }}>EXCLUIR</span> para confirmar:
          </p>
          <input value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="EXCLUIR"
            className="w-full px-4 py-3 rounded-[13px] text-[14px] font-semibold outline-none text-center tracking-widest"
            style={{ border: `1.5px solid ${confirm.trim().toUpperCase() === 'EXCLUIR' ? C.brand : C.borderSoft}`, color: C.text, background: C.card }} />
        </div>

        <div>
          <label htmlFor="senha-excluir" className="text-[12.5px] mb-2 block" style={{ color: C.muted }}>Sua senha</label>
          <input id="senha-excluir" type="password" value={senha} onChange={e => setSenha(e.target.value)}
            autoComplete="current-password" placeholder="••••••••"
            className="w-full px-4 py-3 rounded-[13px] text-[14px] font-medium outline-none"
            style={{ border: `1.5px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
          <p className="text-[11.5px] mt-2" style={{ color: C.subtle }}>
            Pedidos de agendamento e serviços já feitos continuam no registro da oficina, sem seus dados pessoais.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button disabled={!canDelete}
            onClick={() => excluir()}
            className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: C.brand, fontFamily: FONT_HEAD }}>
            {isPending ? 'Excluindo…' : 'Excluir permanentemente'}
          </button>
          <button onClick={() => navigate(-1)}
            className="w-full py-[15px] rounded-[14px] font-bold text-[15px]"
            style={{ border: `1.5px solid ${C.border}`, color: C.text, fontFamily: FONT_HEAD }}>
            Manter minha conta
          </button>
        </div>

      </div>
    </MainLayout>
  );
}
