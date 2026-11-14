import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { SHOWCASE } from '../../config/features';
import {
  Settings, User, CreditCard, Bell, Shield, Lock,
  HelpCircle, FileText, LogOut, Star, ChevronRight, Store, Car, FolderOpen, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { profileApi, vehiclesApi, oficinasApi, documentsApi } from '../../services/api';
import { Glass, IconCircle, V } from '../visual';
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
          <label className="text-[0.75rem] font-semibold" style={{ color: C.muted }}>Nome completo</label>
          <input {...register('name')}
            className="w-full px-4 py-3 rounded-2xl text-[0.8125rem] font-medium outline-none"
            style={{ border: `1px solid ${errors.name ? C.brand : C.borderSoft}`, color: C.text, background: C.card }} />
          {errors.name && <p className="text-[0.6875rem]" style={{ color: C.brand }}>{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold" style={{ color: C.muted }}>Telefone</label>
          <input {...register('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999"
            className="w-full px-4 py-3 rounded-2xl text-[0.8125rem] font-medium outline-none"
            style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
        </div>
        <PrimaryBtn type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar alterações'}</PrimaryBtn>
      </form>
    </BottomSheet>
  );
}

/* ─── Logout confirm ────────────────────────────── */
function LogoutSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <BottomSheet onClose={onClose} title="Sair da conta?">
      <p className="text-[0.8125rem] leading-relaxed pt-1 pb-5" style={{ color: C.muted }}>
        Você precisará entrar novamente para acessar a saúde do seu veículo, agendamentos e documentos.
      </p>
      <div className="flex flex-col gap-2.5">
        <PrimaryBtn onClick={onConfirm}>Sair da conta</PrimaryBtn>
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

  const name  = profile?.name ?? session?.name ?? '';
  const email = profile?.email ?? session?.email ?? '';
  // Contagens reais para o cartão do perfil.
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
  const { data: oficinas = [] } = useQuery({ queryKey: ['oficinas'], queryFn: () => oficinasApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: docs = [] } = useQuery({ queryKey: ['documents'], queryFn: () => documentsApi.list().then(r => r.data), staleTime: 60_000 });
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
        <Topbar title="Conta" right={
          <IconCircle label="Ajustes" onClick={() => navigate('/ajustes')}><Settings size={18} strokeWidth={1.8} /></IconCircle>
        } />
      }>
        <div className="px-4 pt-3 pb-8 flex flex-col gap-5">
          {isLoading ? (
            <>
              <Skeleton className="h-[80px] rounded-2xl" />
              <Skeleton className="h-[200px] rounded-2xl" />
            </>
          ) : (
            <>
              {/* Cartão do perfil */}
              <Glass className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center flex-none"
                       style={{ background: 'linear-gradient(160deg, #8E8E93, #636366)' }}>
                    <span className="text-[1.375rem] font-medium text-white" style={{ fontFamily: FONT_HEAD }}>{initial}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="t-title3 truncate" style={{ color: V.text }}>{name}</p>
                    <p className="text-[0.8125rem] mt-0.5 truncate" style={{ color: V.muted }}>{email}</p>
                  </div>
                  <button onClick={() => setShowEdit(true)} className="chip h-9 px-4 rounded-full text-[0.8125rem] font-medium flex-none">Editar</button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { n: vehicles.length, t: 'Veículos', to: '/veiculo' },
                    { n: oficinas.length, t: 'Oficinas', to: '/oficinas' },
                    { n: docs.length, t: 'Documentos', to: '/documentos' },
                  ].map(c => (
                    <button key={c.t} onClick={() => navigate(c.to)} className="rounded-2xl p-3 text-left" style={{ background: V.tile }}>
                      <span className="block text-[1.375rem] leading-none font-normal tabular" style={{ color: V.text }}>{String(c.n).padStart(2, '0')}</span>
                      <span className="block text-[0.75rem] mt-1.5" style={{ color: V.muted }}>{c.t}</span>
                    </button>
                  ))}
                </div>
              </Glass>

              {/* Clube badge (showcase) */}
              {SHOWCASE && (
                <button onClick={() => navigate('/clube')}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#1a0a00,#3a1200)' }}>
                  <Star size={22} color={C.gold} fill={C.gold} />
                  <div className="flex-1 text-left">
                    <p className="text-[0.9375rem] font-medium text-white">Clube Ouro</p>
                    <p className="text-[0.75rem]" style={{ color: 'rgba(255,255,255,.6)' }}>1.250 pontos · ver recompensas</p>
                  </div>
                  <ChevronRight size={18} color="rgba(255,255,255,.5)" />
                </button>
              )}

              {/* Conta */}
              <div>
                <SectionLabel>Conta</SectionLabel>
                <CardGroup>
                  <MenuRow icon={<User size={18} />} label="Meus dados" onClick={() => setShowEdit(true)} />
                  <MenuRow icon={<Car size={18} />} label="Meus veículos" onClick={() => navigate('/veiculo')} />
                  <MenuRow icon={<Store size={18} />} label="Minhas oficinas" onClick={() => navigate('/oficinas')} />
                  <MenuRow icon={<FolderOpen size={18} />} label="Documentos" onClick={() => navigate('/documentos')} />
                  <MenuRow icon={<Receipt size={18} />} label="Orçamentos" onClick={() => navigate('/orcamentos')} />
                  {SHOWCASE && (
                    <MenuRow icon={<CreditCard size={18} />} label="Formas de pagamento" onClick={() => navigate('/pagamento')} />
                  )}
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

              <p className="text-center text-[0.6875rem]" style={{ color: C.subtle }}>RevisaCar · versão 1.0.0</p>
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
