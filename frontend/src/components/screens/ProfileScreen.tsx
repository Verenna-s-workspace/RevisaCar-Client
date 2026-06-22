import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, CreditCard, Bell, Shield, Lock,
  HelpCircle, FileText, LogOut, Star, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { profileApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, SectionLabel, CardGroup, MenuRow, PrimaryBtn, OutlineBtn } from '../ui/pro';

const profileSchema = z.object({
  name:  z.string().min(2, 'Nome muito curto'),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

/* ─── Edit Sheet ────────────────────────────────── */
function EditSheet({ name, phone, onClose }: { name: string; phone?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });
  const { mutate, isPending } = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Perfil atualizado!'); onClose(); },
    onError: () => toast.error('Erro ao atualizar'),
  });

  return (
    <BottomSheet onClose={onClose} title="Meus dados">
      <form onSubmit={handleSubmit(d => mutate(d))} className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>Nome completo</label>
          <input {...register('name')}
            className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
            style={{ border: `1px solid ${errors.name ? C.brand : C.borderSoft}`, color: C.text, background: C.card }} />
          {errors.name && <p className="text-[11px]" style={{ color: C.brand }}>{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>Telefone</label>
          <input {...register('phone')} placeholder="(11) 99999-9999"
            className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
            style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
        </div>
        <PrimaryBtn disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar alterações'}</PrimaryBtn>
      </form>
    </BottomSheet>
  );
}

/* ─── Logout confirm ────────────────────────────── */
function LogoutSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <BottomSheet onClose={onClose} title="Sair da conta?">
      <p className="text-[13.5px] leading-relaxed pt-1 pb-5" style={{ color: C.muted }}>
        Você precisará entrar novamente para acessar a saúde do seu veículo, agendamentos e documentos.
      </p>
      <div className="flex flex-col gap-2.5">
        <button onClick={onConfirm}
          className="w-full py-[15px] rounded-[14px] font-bold text-[15px] text-white active:scale-[0.98] transition-all"
          style={{ background: C.brand, fontFamily: FONT_HEAD }}>
          Sair da conta
        </button>
        <OutlineBtn onClick={onClose}>Cancelar</OutlineBtn>
      </div>
    </BottomSheet>
  );
}

/* ─── Profile Screen ────────────────────────────── */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { clearSession, session } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(r => r.data),
    staleTime: 120_000,
  });

  const name  = profile?.name ?? session?.name ?? 'João Silva';
  const email = profile?.email ?? session?.email ?? 'joao.silva@email.com';
  const initial = name.charAt(0).toUpperCase();

  const doLogout = () => {
    clearSession();
    toast.success('Você saiu da conta');
    setShowLogout(false);
    navigate('/login');
  };

  return (
    <>
      <MainLayout topbar={
        <Topbar title="Perfil" right={
          <button aria-label="Ajustes" onClick={() => navigate('/ajustes')}
                  className="w-10 h-10 flex items-center justify-center">
            <Settings size={20} color={C.text} strokeWidth={1.8} />
          </button>
        } />
      }>
        <div className="px-4 pt-3 pb-8 flex flex-col gap-5">
          {isLoading ? (
            <>
              <Skeleton className="h-[80px] rounded-[16px]" />
              <Skeleton className="h-[200px] rounded-[16px]" />
            </>
          ) : (
            <>
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center flex-none"
                     style={{ background: C.brand }}>
                  <span className="text-[24px] font-extrabold text-white" style={{ fontFamily: FONT_HEAD }}>{initial}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[18px] truncate" style={{ color: C.text, fontFamily: FONT_HEAD }}>{name}</p>
                  <p className="text-[13px] mt-0.5 truncate" style={{ color: C.muted }}>{email}</p>
                </div>
              </div>

              {/* Clube badge */}
              <button onClick={() => navigate('/clube')}
                className="flex items-center gap-3 p-4 rounded-[16px]"
                style={{ background: 'linear-gradient(135deg,#1a0a00,#3a1200)' }}>
                <Star size={22} color={C.gold} fill={C.gold} />
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-bold text-white">Clube Ouro</p>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,.6)' }}>1.250 pontos · ver recompensas</p>
                </div>
                <ChevronRight size={18} color="rgba(255,255,255,.5)" />
              </button>

              {/* Conta */}
              <div>
                <SectionLabel>Conta</SectionLabel>
                <CardGroup>
                  <MenuRow icon={<User size={18} />} label="Meus dados" onClick={() => setShowEdit(true)} />
                  <MenuRow icon={<CreditCard size={18} />} label="Formas de pagamento" onClick={() => navigate('/pagamento')} />
                  <MenuRow icon={<Bell size={18} />} label="Notificações" onClick={() => navigate('/preferencias')} />
                  <MenuRow icon={<Shield size={18} />} label="Segurança" onClick={() => navigate('/seguranca')} />
                  <MenuRow icon={<Lock size={18} />} label="Privacidade" last onClick={() => navigate('/privacidade')} />
                </CardGroup>
              </div>

              {/* Suporte */}
              <div>
                <SectionLabel>Suporte</SectionLabel>
                <CardGroup>
                  <MenuRow icon={<HelpCircle size={18} />} label="Ajuda e suporte" onClick={() => navigate('/ajuda')} />
                  <MenuRow icon={<FileText size={18} />} label="Termos e políticas" last onClick={() => navigate('/termos')} />
                </CardGroup>
              </div>

              {/* Logout */}
              <CardGroup>
                <MenuRow icon={<LogOut size={18} color={C.brand} />} iconBg={C.redBg}
                         label="Sair da conta" danger last onClick={() => setShowLogout(true)} />
              </CardGroup>

              <p className="text-center text-[11px]" style={{ color: C.subtle }}>RevisaCar · versão 1.0.0</p>
            </>
          )}
        </div>
      </MainLayout>

      {showEdit && (
        <EditSheet name={name} phone={profile?.phone} onClose={() => setShowEdit(false)} />
      )}
      {showLogout && (
        <LogoutSheet onClose={() => setShowLogout(false)} onConfirm={doLogout} />
      )}
    </>
  );
}
