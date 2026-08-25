import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { AuthLayout } from '../layout';

type Status = 'loading' | 'ok' | 'error';

export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [resendEmail, setResendEmail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // evita rodar 2x no StrictMode
    authApi.verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    try {
      await authApi.resendVerification(resendEmail);
      toast.success('Se houver uma conta não verificada, enviamos um novo link.');
    } catch {
      toast.error('Não foi possível reenviar agora.');
    }
  }

  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col justify-center px-6"
           style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #111111 50%, #0D0D0D 100%)' }}>
        <div className="bg-white rounded-[28px] px-6 py-8 flex flex-col gap-5 animate-fade-up">
          <div className="flex flex-col items-center text-center gap-3">
            {status === 'loading' && (
              <>
                <Loader2 size={40} color="var(--brand)" className="animate-spin" />
                <h2 className="text-xl font-bold text-text">Confirmando seu e-mail…</h2>
              </>
            )}
            {status === 'ok' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                     style={{ background: 'rgba(22,128,60,0.1)' }}>
                  <CheckCircle2 size={34} color="#16803C" />
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">E-mail confirmado!</h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-[260px]">
                  Sua conta está ativa. Você já pode usar todos os recursos do RevisaCar.
                </p>
                <button onClick={() => navigate('/login', { replace: true })}
                        className="w-full py-4 mt-2 bg-brand rounded-2xl text-white text-base font-bold
                                   active:scale-[0.97] transition-all hover:bg-brand-dark">
                  Ir para o login
                </button>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                     style={{ background: 'var(--brand-tint)' }}>
                  <XCircle size={34} color="var(--brand)" />
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">Link inválido ou expirado</h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-[270px]">
                  Informe seu e-mail para receber um novo link de confirmação.
                </p>
                <form onSubmit={resend} className="w-full flex flex-col gap-3 mt-2">
                  <input type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                         placeholder="seu@email.com" autoComplete="email"
                         className="w-full px-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none border"
                         style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                  <button type="submit" disabled={!resendEmail}
                          className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold
                                     disabled:opacity-50 active:scale-[0.97] transition-all hover:bg-brand-dark
                                     flex items-center justify-center gap-2">
                    <MailCheck size={18} /> Reenviar confirmação
                  </button>
                  <button type="button" onClick={() => navigate('/login', { replace: true })}
                          className="text-center text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                    Voltar ao login
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
