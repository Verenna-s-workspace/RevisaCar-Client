import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, Phone, MapPin, Lock, LogOut,
  ChevronRight, Bell, Shield, HelpCircle, Star,
  FileText, Car, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { profileApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { Button, Input, Avatar, Skeleton } from '../ui';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';

/* ─── Schemas ───────────────────────────────────────────── */
const profileSchema = z.object({
  name:    z.string().min(2, 'Nome muito curto'),
  phone:   z.string().optional(),
  cpf:     z.string().optional(),
  address: z.string().optional(),
});
const passwordSchema = z.object({
  old_password:         z.string().min(1, 'Obrigatório'),
  new_password:         z.string().min(8, 'Mínimo 8 caracteres'),
  new_password_confirm: z.string(),
}).refine(d => d.new_password === d.new_password_confirm, {
  path: ['new_password_confirm'], message: 'As senhas não coincidem',
});

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

/* ─── Edit Profile Sheet ────────────────────────────────── */
function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(r => r.data),
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name, phone: profile?.phone,
      cpf: profile?.cpf, address: profile?.address,
    },
  });
  const onSubmit = async (data: ProfileForm) => {
    try {
      await profileApi.update(data);
      toast.success('Perfil atualizado!');
      qc.invalidateQueries({ queryKey: ['profile'] });
      onClose();
    } catch { toast.error('Erro ao atualizar perfil'); }
  };

  return (
    <BottomSheet onClose={onClose} title="Editar Perfil">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <Input label="Nome completo" error={errors.name?.message} {...register('name')} />
        <Input label="Telefone" type="tel" placeholder="(11) 99999-9999" {...register('phone')} />
        <Input label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
        <Input label="Endereço" placeholder="Rua, nº, bairro, cidade" {...register('address')} />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>Salvar alterações</Button>
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
      </form>
    </BottomSheet>
  );
}

/* ─── Change Password Sheet ─────────────────────────────── */
function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });
  const onSubmit = async (data: PasswordForm) => {
    try {
      await profileApi.changePassword(data);
      toast.success('Senha alterada com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Senha atual incorreta');
    }
  };

  return (
    <BottomSheet onClose={onClose} title="Alterar Senha">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <Input label="Senha atual" type="password" error={errors.old_password?.message} {...register('old_password')} />
        <Input label="Nova senha" type="password" placeholder="Mínimo 8 caracteres"
          error={errors.new_password?.message} {...register('new_password')} />
        <Input label="Confirmar nova senha" type="password"
          error={errors.new_password_confirm?.message} {...register('new_password_confirm')} />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          <Lock size={16} /> Alterar senha
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
      </form>
    </BottomSheet>
  );
}

/* ─── Menu Item ─────────────────────────────────────────── */
function MenuItem({ icon: Icon, label, sublabel, badge, onClick, danger, iconBg, iconColor }: {
  icon: typeof User;
  label: string;
  sublabel?: string;
  badge?: string | number;
  onClick?: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-border
                 last:border-0 hover:bg-surface-2 active:bg-surface-3 transition-colors text-left"
    >
      <div className={clsx(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        danger ? 'bg-crit-bg' : iconBg || 'bg-surface-3'
      )}>
        <Icon size={17} className={danger ? 'text-crit' : iconColor || 'text-text-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold', danger ? 'text-crit' : 'text-text')}>{label}</p>
        {sublabel && <p className="text-xs text-text-subtle mt-0.5">{sublabel}</p>}
      </div>
      {badge !== undefined && (
        <span className="text-xs font-bold bg-brand text-white rounded-full px-2 py-0.5 mr-1">
          {badge}
        </span>
      )}
      {!danger && <ChevronRight size={15} className="text-text-ghost flex-shrink-0" />}
    </button>
  );
}

/* ─── Profile Screen ────────────────────────────────────── */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { session, clearSession } = useAuthStore();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(r => r.data),
  });

  const handleLogout = () => {
    clearSession();
    qc.clear();
    navigate('/login');
    toast.success('Até logo! 👋');
  };

  return (
    <>
      <MainLayout topbar={<Topbar title="Meu Perfil" showBack />}>

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-brand via-brand-dark to-brand-deep
                        px-5 pt-10 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/[0.04]" />

          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            {isLoading ? (
              <Skeleton className="w-20 h-20 rounded-full" />
            ) : (
              <Avatar name={session?.name || 'U'} size={76} />
            )}
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-52" />
              </div>
            ) : (
              <>
                <div>
                  <p className="font-bold text-xl text-white">{profile?.name}</p>
                  <p className="text-sm text-white/70 mt-0.5">{profile?.email}</p>
                  {profile?.phone && (
                    <p className="text-xs text-white/55 mt-0.5">{profile.phone}</p>
                  )}
                </div>
                {profile?.created_at && (
                  <p className="text-xs text-white/45">
                    Cliente desde {format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </>
            )}
            <button
              onClick={() => setShowEdit(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-white/14 backdrop-blur-sm
                         border border-white/22 rounded-xl text-xs font-semibold text-white
                         hover:bg-white/22 transition-all active:scale-95"
            >
              Editar perfil
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-4 -mt-4 bg-white rounded-2xl border border-border shadow-md z-10 relative">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: 'Veículos', value: '2', icon: Car },
              { label: 'Serviços', value: '12', icon: Clock },
              { label: 'Orçamentos', value: '3', icon: FileText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-4">
                <Icon size={16} className="text-text-muted" />
                <p className="text-xl font-bold text-text tabular">{value}</p>
                <p className="text-2xs text-text-subtle font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 mt-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-0.5">
            Informações pessoais
          </p>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs mb-5">
            {[
              { icon: Mail,   label: 'E-mail',   value: profile?.email },
              { icon: Phone,  label: 'Telefone', value: profile?.phone || 'Não informado' },
              { icon: User,   label: 'CPF',      value: profile?.cpf ? `•••.•••.•••-${profile.cpf.slice(-2)}` : 'Não informado' },
              { icon: MapPin, label: 'Endereço', value: profile?.address || 'Não informado' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0">
                <div className="w-8 h-8 bg-surface-3 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-text-muted" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xs text-text-subtle font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-text mt-0.5 truncate">
                    {isLoading ? '—' : value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Settings */}
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-0.5">Conta</p>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs mb-5">
            <MenuItem icon={Lock} label="Alterar senha" sublabel="Atualizar credenciais de acesso"
              iconBg="bg-info-bg" iconColor="text-info" onClick={() => setShowPassword(true)} />
            <MenuItem icon={Bell} label="Notificações" sublabel="Configurar alertas e lembretes"
              iconBg="bg-warn-bg" iconColor="text-warn" onClick={() => navigate('/notificacoes')} />
            <MenuItem icon={Shield} label="Privacidade" sublabel="Dados pessoais e permissões"
              iconBg="bg-ok-bg" iconColor="text-ok" onClick={() => toast('Em breve')} />
          </div>

          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-0.5">Suporte</p>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs mb-5">
            <MenuItem icon={HelpCircle} label="Central de ajuda" sublabel="Dúvidas e suporte técnico"
              onClick={() => toast('Em breve')} />
            <MenuItem icon={Star} label="Avaliar o app" sublabel="Nos ajude a melhorar"
              onClick={() => toast('Obrigado pelo feedback! ⭐')} />
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs mb-6">
            <MenuItem icon={LogOut} label="Sair da conta" danger onClick={handleLogout} />
          </div>

          <p className="text-center text-xs text-text-ghost pb-2">
            RevisaCar v1.0.0 · Todos os direitos reservados
          </p>
        </div>
      </MainLayout>

      <AnimatePresence>
        {showEdit     && <EditProfileSheet onClose={() => setShowEdit(false)} />}
        {showPassword && <ChangePasswordSheet onClose={() => setShowPassword(false)} />}
      </AnimatePresence>
    </>
  );
}
