import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { AuthLayout } from '../layout';

export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tooShort = pwd.length > 0 && pwd.length < 8;
  const mismatch = confirm.length > 0 && pwd !== confirm;
  const valid = pwd.length >= 8 && pwd === confirm && !!token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, pwd, confirm);
      toast.success('Senha redefinida! Faça login com a nova senha.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Link inválido ou expirado. Solicite um novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex-1 flex flex-col justify-center px-6"
           style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #111111 50%, #0D0D0D 100%)' }}>
        <div className="bg-white rounded-[28px] px-6 py-8 flex flex-col gap-6 animate-fade-up">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                 style={{ background: 'var(--brand-tint)' }}>
              <ShieldCheck size={26} color="var(--brand)" />
            </div>
            <h2 className="text-2xl font-bold text-text tracking-tight">Nova senha</h2>
            <p className="text-sm text-text-muted leading-relaxed max-w-[260px]">
              {token ? 'Escolha uma nova senha para sua conta RevisaCar.'
                     : 'Link inválido. Solicite uma nova recuperação de senha.'}
            </p>
          </div>

          {token && (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-muted">Nova senha</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
                    placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                    className="w-full px-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none border transition-colors"
                    style={{ borderColor: tooShort ? 'var(--crit)' : 'var(--border)', color: 'var(--text)' }}
                  />
                  <button type="button" aria-label="Mostrar senha" onClick={() => setShow(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {tooShort && <span className="text-[11.5px]" style={{ color: 'var(--crit)' }}>A senha deve ter pelo menos 8 caracteres.</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-muted">Confirmar senha</label>
                <input
                  type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha" autoComplete="new-password"
                  className="w-full px-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none border transition-colors"
                  style={{ borderColor: mismatch ? 'var(--crit)' : 'var(--border)', color: 'var(--text)' }}
                />
                {mismatch && <span className="text-[11.5px]" style={{ color: 'var(--crit)' }}>As senhas não coincidem.</span>}
              </div>

              <button type="submit" disabled={!valid || submitting}
                      className="w-full py-4 bg-brand rounded-2xl text-white text-base font-bold mt-2
                                 disabled:opacity-50 active:scale-[0.97] transition-all hover:bg-brand-dark">
                {submitting ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </form>
          )}

          <button onClick={() => navigate('/login', { replace: true })}
                  className="text-center text-sm font-semibold" style={{ color: 'var(--brand)' }}>
            Voltar ao login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
