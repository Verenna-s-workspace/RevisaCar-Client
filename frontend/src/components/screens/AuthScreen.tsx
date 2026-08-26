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

/* ─── Verenna Logo SVG ──────────────────────────────────── */
function VereennaLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="26" stroke="white" strokeWidth="2.5"/>
      <path d="M14 30 Q19 20 24 23 Q29 26 34 19"
            stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="38" r="4" fill="white"/>
      <circle cx="39" cy="38" r="4" fill="white"/>
      <path d="M21 38 L35 38" stroke="white" strokeWidth="2.5"/>
    </svg>
  );
}

/* ─── Field ─────────────────────────────────────────────── */
function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-2 tracking-wide">{label}</label>
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
        className={`w-full px-4 py-3.5 rounded-xl border-[1.5px] text-sm font-medium text-text bg-white
                    outline-none transition-all placeholder:text-text-ghost font-sans
                    ${error
                      ? 'border-crit focus:border-crit focus:shadow-[0_0_0_3px_rgba(204,20,0,0.1)]'
                      : 'border-border focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,20,0,0.1)]'
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
      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <VereennaLogo size={72} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-center"
        >
          <div className="text-[2.9rem] text-white leading-none mb-2"
               style={{ fontFamily: 'var(--font-logo)', fontWeight: 600, letterSpacing: '-0.01em' }}>
            verenna
          </div>
          <p className="text-sm text-white/60 font-medium leading-relaxed max-w-[240px]">
            Bem-vindo! Faça login para acessar as informações do seu veículo.
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
          className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold
                     active:scale-[0.97] transition-all shadow-lg shadow-brand/30
                     hover:bg-brand-dark"
        >
          Entrar
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-xs text-white/40 font-medium">ou</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        <button
          onClick={onRegister}
          className="w-full py-4 bg-transparent border-2 border-white/25 rounded-2xl
                     text-white text-base font-bold active:scale-[0.97] transition-all
                     hover:border-white/40 hover:bg-white/5"
        >
          Criar conta
        </button>

        <button
          onClick={onForgot}
          className="text-center text-sm text-white/50 font-medium hover:text-white/70
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
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white
                     hover:bg-white/20 transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 pb-10 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Entrar</h2>
          <p className="text-sm text-text-muted mt-1">Acesse sua conta verenna</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" placeholder="seu@email.com" autoComplete="email"
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
            className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold mt-2
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
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white
                     hover:bg-white/20 transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 pb-10 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Criar conta</h2>
          <p className="text-sm text-text-muted mt-1">Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nome completo" error={errors.name?.message}>
            <TextInput type="text" placeholder="João Silva"
              error={errors.name?.message} {...register('name')} />
          </Field>
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" placeholder="seu@email.com"
              error={errors.email?.message} {...register('email')} />
          </Field>
          <Field label="Telefone" error={errors.phone?.message}>
            <TextInput type="tel" placeholder="(11) 99999-9999"
              error={errors.phone?.message} {...register('phone')} />
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
            className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold mt-2
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
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white
                     hover:bg-white/20 transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 pb-10 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Recuperar senha</h2>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="E-mail" error={errors.email?.message}>
            <TextInput type="email" placeholder="seu@email.com"
              error={errors.email?.message} {...register('email')} />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold mt-2
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
    <div className="min-h-screen max-w-[430px] mx-auto flex flex-col relative overflow-hidden"
         style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #111111 50%, #0D0D0D 100%)' }}>

      {/* Background car silhouette — decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-[30%] left-0 right-0 h-64
                        bg-[radial-gradient(ellipse_at_center,_rgba(204,20,0,0.08)_0%,_transparent_70%)]" />
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full
                        bg-white/[0.015] blur-3xl" />
        <div className="absolute top-10 -left-10 w-52 h-52 rounded-full
                        bg-brand/[0.06] blur-2xl" />
        {/* Car outline decoration */}
        <svg className="absolute bottom-[28%] left-1/2 -translate-x-1/2 opacity-[0.04]"
             width="360" height="140" viewBox="0 0 360 140" fill="white">
          <path d="M60 80 L80 40 Q100 20 140 18 L220 18 Q260 18 280 40 L300 80 L320 85 L320 110
                   L280 110 L280 100 Q280 88 268 88 Q256 88 256 100 L256 110 L104 110 L104 100
                   Q104 88 92 88 Q80 88 80 100 L80 110 L40 110 L40 85 Z"/>
        </svg>
      </div>

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
  );
}
