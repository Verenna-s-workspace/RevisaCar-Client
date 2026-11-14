import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { BrandPanel } from '../layout';

/* ─── Schemas ───────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
const registerSchema = z.object({
  name:             z.string().min(2, 'Nome muito curto'),
  email:            z.string().email('E-mail inválido'),
  phone:            z.string().min(10, 'Telefone inválido'),
  password:         z.string().min(8, 'Mínimo 8 caracteres'),
  password_confirm: z.string(),
}).refine(d => d.password === d.password_confirm, {
  path: ['password_confirm'],
  message: 'As senhas não coincidem',
});
const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotForm   = z.infer<typeof forgotSchema>;
type Screen = 'home' | 'login' | 'register' | 'forgot';

/* ─── Marca ─────────────────────────────────────────────── */
function MarcaRevisaCar() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={40} height={40} />
      <span className="text-[1.75rem] leading-none" style={{ fontFamily: 'var(--font-logo)', fontWeight: 600, color: '#fff' }}>
        RevisaCar
      </span>
    </span>
  );
}

/* ─── Field ─────────────────────────────────────────────── */
function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.75rem] font-medium text-text-muted px-1">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-crit font-medium">{error}</p>
      )}
    </div>
  );
}

// forwardRef é essencial: o react-hook-form injeta um `ref` via {...register(...)}.
// Sem encaminhá-lo ao <input>, o RHF não lê os valores e marca tudo como vazio.
const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: string; suffix?: React.ReactNode }
>(function TextInput({ error, suffix, ...props }, ref) {
  return (
    <div className="relative flex items-center">
      <input
        ref={ref}
        className={`w-full px-4 py-3.5 rounded-2xl border text-[0.9375rem] text-text bg-surface
                    outline-none transition-all placeholder:text-text-ghost font-sans
                    ${error
                      ? 'border-crit focus:border-crit focus:shadow-[0_0_0_3px_rgba(204,20,0,0.1)]'
                      : 'border-white focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,20,0,0.1)]'
                    }`}
        {...props}
      />
      {suffix && (
        <div className="absolute right-3.5 flex items-center">{suffix}</div>
      )}
    </div>
  );
});

/* ─── Home Screen ───────────────────────────────────────── */
function HomeScreen({ onLogin, onRegister, onForgot }: { onLogin: () => void; onRegister: () => void; onForgot: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-between h-full px-6 pt-20 pb-12"
    >
      {/* Marca + carro */}
      <div className="flex flex-col items-center gap-6 w-full">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <MarcaRevisaCar />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full">
          <img src="/veiculos/toyota-corolla.webp" alt="" className="w-full max-w-[380px] mx-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center">
          <h1 className="t-title1" style={{ color: '#fff' }}>Bem-vindo!</h1>
          <p className="t-subhead mt-2 max-w-[280px] mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Faça login para acessar as informações do seu veículo.
          </p>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="w-full flex flex-col gap-3"
      >
        <button
          onClick={onLogin}
          className="w-full h-12 rounded-[10px] text-white t-headline active:scale-[0.98] transition-all"
          style={{ background: '#CC1400' }}
        >
          Entrar
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/20" />
          <span className="t-caption" style={{ color: 'rgba(255,255,255,0.6)' }}>ou</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <button
          onClick={onRegister}
          className="w-full h-12 rounded-[10px] t-headline active:scale-[0.98] text-white"
          style={{ border: '1.5px solid rgba(255,255,255,0.85)' }}
        >
          Criar conta
        </button>

        <button
          onClick={onForgot}
          className="text-center t-subhead font-medium text-white/80 hover:text-white
                     transition-colors mt-2"
        >
          Esqueci minha senha
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Login Form ────────────────────────────────────────── */
function LoginScreen({ onBack, onSuccess, onForgot }: {
  onBack: () => void; onSuccess: () => void; onForgot: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const { setSession } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data.email, data.password);
      setSession({
        id: res.data.customer.id,
        name: res.data.customer.name,
        email: res.data.customer.email,
        access: res.data.access,
        refresh: res.data.refresh,
      });
      toast.success(`Bem-vindo de volta, ${res.data.customer.name.split(' ')[0]}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'E-mail ou senha incorretos');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full"
    >
      {/* Sheet handle area */}
      <div className="flex items-center px-4 pt-4 pb-2">
        <button onClick={onBack}
          className="chip w-10 h-10 flex items-center justify-center rounded-full text-brand">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 glass rounded-t-[32px] lg:rounded-[32px] lg:mx-4 lg:mb-6 px-6 pt-8 pb-10 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-[1.75rem] font-normal text-text">Entrar</h2>
          <p className="text-sm text-text-muted mt-1">Acesse sua conta RevisaCar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="seu@email.com" autoComplete="email"
              error={errors.email?.message} {...register('email')} />
          </Field>

          <Field label="Senha" error={errors.password?.message}>
            <TextInput
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              suffix={
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="text-text-subtle hover:text-text transition-colors p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('password')}
            />
          </Field>

          <div className="flex justify-end -mt-1">
            <button type="button" onClick={onForgot}
              className="text-xs font-semibold text-brand hover:underline underline-offset-2">
              Esqueci minha senha
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] bg-brand rounded-full text-white text-[0.9375rem] font-medium mt-2
                       disabled:opacity-50 active:scale-[0.97] transition-all
                       hover:bg-brand-dark shadow-md shadow-brand/20"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar na conta'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

/* ─── Register Form ─────────────────────────────────────── */
function RegisterScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const { setSession } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await authApi.register(data);
      setSession({
        id: res.data.customer.id,
        name: res.data.customer.name,
        email: res.data.customer.email,
        access: res.data.access,
        refresh: res.data.refresh,
      });
      toast.success('Conta criada com sucesso! 🎉');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conta');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center px-4 pt-4 pb-2">
        <button onClick={onBack}
          className="chip w-10 h-10 flex items-center justify-center rounded-full text-brand">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 glass rounded-t-[32px] lg:rounded-[32px] lg:mx-4 lg:mb-6 px-6 pt-8 pb-10 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-[1.75rem] font-normal text-text">Criar conta</h2>
          <p className="text-sm text-text-muted mt-1">Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nome completo" error={errors.name?.message}>
            <TextInput type="text" placeholder="João Silva"
              error={errors.name?.message} {...register('name')} />
          </Field>
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="seu@email.com"
              error={errors.email?.message} {...register('email')} />
          </Field>
          <Field label="Telefone" error={errors.phone?.message}>
            <TextInput type="tel" placeholder="(11) 99999-9999"
              inputMode="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
          </Field>
          <Field label="Senha" error={errors.password?.message}>
            <TextInput
              type={showPw ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              suffix={
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="text-text-subtle hover:text-text transition-colors p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('password')}
            />
          </Field>
          <Field label="Confirmar senha" error={errors.password_confirm?.message}>
            <TextInput type="password" placeholder="Repita a senha"
              error={errors.password_confirm?.message} {...register('password_confirm')} />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] bg-brand rounded-full text-white text-[0.9375rem] font-medium mt-2
                       disabled:opacity-50 active:scale-[0.97] transition-all
                       hover:bg-brand-dark shadow-md shadow-brand/20"
          >
            {isSubmitting ? 'Criando conta...' : 'Criar minha conta'}
          </button>

          <p className="text-xs text-center text-text-subtle leading-relaxed">
            Ao criar uma conta você concorda com nossos{' '}
            <span className="text-brand font-semibold">Termos de Uso</span>
            {' '}e{' '}
            <span className="text-brand font-semibold">Política de Privacidade</span>.
          </p>
        </form>
      </div>
    </motion.div>
  );
}

/* ─── Forgot Password ───────────────────────────────────── */
function ForgotScreen({ onBack }: { onBack: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      await authApi.forgotPassword(data.email);
      toast.success('Instruções enviadas para o e-mail!');
      onBack();
    } catch {
      toast.error('Erro ao enviar. Tente novamente.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center px-4 pt-4 pb-2">
        <button onClick={onBack}
          className="chip w-10 h-10 flex items-center justify-center rounded-full text-brand">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 glass rounded-t-[32px] lg:rounded-[32px] lg:mx-4 lg:mb-6 px-6 pt-8 pb-10 flex flex-col gap-6">
        <div>
          <h2 className="text-[1.75rem] font-normal text-text">Recuperar senha</h2>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="seu@email.com"
              error={errors.email?.message} {...register('email')} />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] bg-brand rounded-full text-white text-[0.9375rem] font-medium mt-2
                       disabled:opacity-50 active:scale-[0.97] transition-all hover:bg-brand-dark"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

/* ─── Auth Screen ───────────────────────────────────────── */
export function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('home');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full">
    {/* Desktop: painel da marca à esquerda, acesso à direita */}
    <BrandPanel />
    <div className="min-h-screen w-full max-w-[430px] mx-auto flex flex-col relative overflow-hidden lg:mx-0 lg:max-w-none lg:w-[480px] lg:flex-none"
         style={{ background: 'radial-gradient(120% 60% at 50% 38%, #3A0A06 0%, #120807 45%, #050505 100%)' }}>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeScreen
                onLogin={() => setScreen('login')}
                onRegister={() => setScreen('register')}
                onForgot={() => setScreen('forgot')}
              />
            </motion.div>
          )}
          {screen === 'login' && (
            <motion.div key="login" className="flex flex-col h-full">
              <LoginScreen
                onBack={() => setScreen('home')}
                onSuccess={() => navigate('/')}
                onForgot={() => setScreen('forgot')}
              />
            </motion.div>
          )}
          {screen === 'register' && (
            <motion.div key="register" className="flex flex-col h-full">
              <RegisterScreen
                onBack={() => setScreen('home')}
                onSuccess={() => navigate('/')}
              />
            </motion.div>
          )}
          {screen === 'forgot' && (
            <motion.div key="forgot" className="flex flex-col h-full">
              <ForgotScreen onBack={() => setScreen('login')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
}
