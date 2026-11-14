import { useEffect, useMemo, useState } from 'react';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { C } from '../ui/pro';

type Credito = { id: string; marca: string; modelo: string; autor: string; licenca: string; licencaUrl: string; fonte: string };

/**
 * Créditos das fotos de veículos (Wikimedia Commons, licenças livres). Obrigatório
 * pelas licenças CC BY / CC BY-SA: autor, licença e indicação de que a foto foi
 * modificada (fundo removido, recorte e redimensionamento).
 */
export function CreditsScreen() {
  const [lista, setLista] = useState<Credito[] | null>(null);
  const [busca, setBusca] = useState('');
  useEffect(() => { import('../../data/veiculos-fotos.json').then(m => setLista(m.default as Credito[])); }, []);
  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista ?? []).filter(c => !q || `${c.marca} ${c.modelo} ${c.autor}`.toLowerCase().includes(q));
  }, [lista, busca]);

  return (
    <MainLayout showNav={false} topbar={<Topbar title="Créditos de imagens" showBack backLabel="Ajustes" />}>
      <div className="px-4 pb-8 flex flex-col gap-3">
        <p className="t-subhead" style={{ color: C.muted }}>
          As fotos dos veículos vêm do Wikimedia Commons, sob licenças livres. Elas foram modificadas
          (fundo removido, recortadas e redimensionadas). Marcas e modelos pertencem aos fabricantes e
          servem só para identificar o seu veículo.
        </p>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar marca, modelo ou autor"
          aria-label="Buscar nos créditos" className="w-full h-10 px-3 rounded-[10px] t-body outline-none"
          style={{ background: 'var(--fill)', color: C.text }} />
        {!lista ? <Skeleton className="h-60 rounded-xl" /> : (
          <div className="glass rounded-xl overflow-hidden">
            {filtrada.map((c, i) => (
              <div key={c.id} className="px-4 py-2.5" style={{ boxShadow: i === filtrada.length - 1 ? 'none' : `0 0.5px 0 ${C.border}` }}>
                <p className="t-body" style={{ color: C.text }}>{c.marca} {c.modelo}</p>
                <p className="t-footnote" style={{ color: C.muted }}>
                  Foto: {c.autor || 'autor desconhecido'} ·{' '}
                  {c.licencaUrl ? <a href={c.licencaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--tint)' }}>{c.licenca}</a> : c.licenca}
                  {c.fonte && <> · <a href={c.fonte} target="_blank" rel="noreferrer" style={{ color: 'var(--tint)' }}>original</a></>}
                </p>
              </div>
            ))}
            {filtrada.length === 0 && <p className="t-subhead px-4 py-6 text-center" style={{ color: C.muted }}>Nada encontrado.</p>}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
