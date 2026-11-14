import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Store, Plus, CalendarPlus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { oficinasApi } from '../../services/api';
import { codigoValido, extrairCodigo, lerConvitePendente, limparConvitePendente } from '../../lib/convite';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FONT_HEAD, FullState, PrimaryBtn, OutlineBtn } from '../ui/pro';

function mensagemDeErro(e: unknown) {
  const d = (e as AxiosError<{ detail?: string }>)?.response?.data;
  return d?.detail || 'Não foi possível usar este convite agora.';
}

/** Confirmação explícita: entrar na carteira = autorizar a oficina a ver você. */
function EntrarSheet({ codigoInicial, onClose }: { codigoInicial: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState(codigoInicial);
  const codigo = extrairCodigo(texto);
  const valido = codigoValido(codigo);

  const { mutate, isPending } = useMutation({
    mutationFn: () => oficinasApi.usarConvite(codigo).then(r => r.data),
    onSuccess: (res) => {
      limparConvitePendente();
      qc.invalidateQueries({ queryKey: ['oficinas'] });
      const nome = res.oficina?.nome || 'a oficina';
      toast.success(res.novo === false ? `Você já estava em ${nome}` : `Pronto! Você entrou em ${nome}`);
      onClose();
    },
    onError: (e) => {
      limparConvitePendente();
      toast.error(mensagemDeErro(e));
    },
  });

  return (
    <BottomSheet onClose={onClose} title="Entrar em uma oficina">
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
          Use o código ou o link que a oficina enviou. Ao entrar, a oficina passa a ver seu nome,
          contato e veículos para agendar serviços e enviar orçamentos. Você pode sair quando quiser
          pedindo à oficina ou excluindo sua conta.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="convite" className="text-[11.5px] font-semibold" style={{ color: C.muted }}>Código ou link do convite</label>
          <input id="convite" value={texto} onChange={e => setTexto(e.target.value)} autoComplete="off" spellCheck={false}
            placeholder="Cole aqui o código ou o link"
            className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
            style={{ border: `1px solid ${texto && !valido ? C.brand : C.borderSoft}`, color: C.text, background: C.card }} />
          {texto && !valido && <p className="text-[11px]" style={{ color: C.brand }}>Código inválido. Confira com a oficina.</p>}
        </div>
        <PrimaryBtn disabled={!valido || isPending} onClick={() => mutate()}>
          {isPending ? 'Entrando…' : 'Autorizar e entrar'}
        </PrimaryBtn>
        <OutlineBtn onClick={() => { limparConvitePendente(); onClose(); }}>Agora não</OutlineBtn>
      </div>
    </BottomSheet>
  );
}

export function OficinasScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState<string | null>(null);

  // Convite vindo do link (?convite= capturado no boot) ou da rota /oficinas?convite=
  useEffect(() => {
    const doLink = params.get('convite') || lerConvitePendente();
    if (doLink) {
      setSheet(doLink);
      if (params.get('convite')) { params.delete('convite'); setParams(params, { replace: true }); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: oficinas = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['oficinas'],
    queryFn: () => oficinasApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  const botaoAdicionar = (
    <button aria-label="Entrar em uma oficina" onClick={() => setSheet('')}
      className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <Plus size={18} color={C.text} />
    </button>
  );

  return (
    <>
      <MainLayout showNav={false} topbar={<Topbar title="Minhas oficinas" showBack right={botaoAdicionar} />}>
        <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
          {isLoading ? (
            [0, 1].map(i => <Skeleton key={i} className="h-[76px] rounded-[16px]" />)
          ) : isError ? (
            <FullState icon={<Store size={42} strokeWidth={1.4} />} title="Não foi possível carregar"
              desc="Verifique sua conexão e tente de novo." primary={{ label: 'Tentar de novo', onClick: () => refetch() }} />
          ) : oficinas.length === 0 ? (
            <FullState
              icon={<Store size={42} strokeWidth={1.4} />}
              title="Você ainda não está em nenhuma oficina"
              desc="Peça o convite (QR ou link) à sua oficina. Com ele você agenda serviços e recebe os orçamentos aqui no app."
              primary={{ label: 'Tenho um convite', onClick: () => setSheet('') }}
            />
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {oficinas.map(o => (
                  <div key={o.oficina_doc} className="flex items-center gap-3.5 p-4 rounded-[16px]"
                       style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-none" style={{ background: C.borderSoft }}>
                      <Store size={20} color={C.brand} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] truncate" style={{ color: C.text, fontFamily: FONT_HEAD }}>{o.nome || 'Oficina'}</p>
                      <p className="text-[11.5px] mt-0.5 flex items-center gap-1" style={{ color: C.muted }}>
                        <Check size={12} color={C.greenDk} />
                        {o.desde ? `Desde ${format(new Date(o.desde), "MMM 'de' yyyy", { locale: ptBR })}` : 'Vinculado'}
                      </p>
                    </div>
                    <button onClick={() => navigate(`/agendar?oficina=${encodeURIComponent(o.oficina_doc)}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-bold flex-none"
                      style={{ background: C.brand, color: '#fff' }}>
                      <CalendarPlus size={14} /> Agendar
                    </button>
                  </div>
                ))}
              </div>
              <OutlineBtn onClick={() => setSheet('')}>Entrar em outra oficina</OutlineBtn>
            </>
          )}
        </div>
      </MainLayout>
      {sheet !== null && <EntrarSheet codigoInicial={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
