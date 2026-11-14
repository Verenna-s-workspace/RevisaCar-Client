import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Share2, Plus, FileText, Shield, Receipt, FileCheck, Car, Trash2, Paperclip } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { documentsApi, vehiclesApi, baixarArquivo } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FullState, PrimaryBtn, OutlineBtn } from '../ui/pro';
import { SwipeRow } from '../visual';
import type { VehicleDocument } from '../../types';

// Tipos diferenciados pelo ÍCONE (forma), com acento único da marca — sem
// tiles multicoloridos. O status (válido/vencido) segue colorido, pois é semântico.
const TYPE_CFG: Record<string, { bg: string; color: string; Icon: typeof Car; label: string }> = {
  crlv:        { bg: C.borderSoft, color: C.brand, Icon: Car,       label: 'CRLV' },
  seguro:      { bg: C.borderSoft, color: C.brand, Icon: Shield,    label: 'Seguro' },
  ipva:        { bg: C.borderSoft, color: C.brand, Icon: Receipt,   label: 'IPVA' },
  garantia:    { bg: C.borderSoft, color: C.brand, Icon: FileCheck, label: 'Garantia' },
  nota_fiscal: { bg: C.borderSoft, color: C.brand, Icon: Receipt,   label: 'Nota fiscal' },
  laudo:       { bg: C.borderSoft, color: C.muted, Icon: FileText,  label: 'Laudo' },
  outro:       { bg: C.borderSoft, color: C.muted, Icon: FileText,  label: 'Documento' },
};

const MAX_MB = 10;
const ACEITOS = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

/** "AAAA-MM-DD" vira data local (sem o fuso puxar para o dia anterior). */
const dia = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00` : s);

function statusOf(expiry?: string) {
  if (!expiry) return null;
  const days = differenceInDays(dia(expiry), new Date());
  if (days < 0)   return { label: 'Vencido',  bg: C.redBg,   color: C.brand };
  if (days <= 30) return { label: 'A vencer', bg: C.goldBg,  color: C.gold };
  return { label: 'Válido', bg: C.greenBg, color: C.greenDk };
}

function erroDaApi(e: unknown, padrao: string) {
  const d = (e as AxiosError<Record<string, string | string[]>>)?.response?.data;
  if (!d) return padrao;
  const v = d.detail ?? d.file ?? d.vehicle_id ?? d.title ?? Object.values(d)[0];
  return (Array.isArray(v) ? v[0] : v) || padrao;
}

function DocCard({ doc }: { doc: VehicleDocument }) {
  const qc = useQueryClient();
  const cfg = TYPE_CFG[doc.type] ?? TYPE_CFG.outro;
  const st = statusOf(doc.expiry_date);
  const [ocupado, setOcupado] = useState<'baixar' | 'compartilhar' | null>(null);
  const [apagar, setApagar] = useState(false);
  const temArquivo = doc.has_file ?? !!doc.file_url;

  const pegarArquivo = async () => {
    const r = await documentsApi.download(doc.id);
    return new File([r.data], doc.file_name || `${doc.title}`, { type: r.data.type || 'application/octet-stream' });
  };

  const baixar = async () => {
    setOcupado('baixar');
    try { const f = await pegarArquivo(); baixarArquivo(f, f.name); }
    catch { toast.error('Não foi possível baixar o arquivo'); }
    finally { setOcupado(null); }
  };

  // Compartilha o PRÓPRIO arquivo (Web Share com arquivos). Sem suporte: baixa.
  const compartilhar = async () => {
    setOcupado('compartilhar');
    try {
      const f = await pegarArquivo();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: doc.title });
      } else {
        baixarArquivo(f, f.name);
        toast('Seu navegador não compartilha arquivos: o documento foi baixado.');
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') toast.error('Não foi possível compartilhar');
    } finally { setOcupado(null); }
  };

  const { mutate: remover, isPending: removendo } = useMutation({
    mutationFn: () => documentsApi.delete(doc.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Documento apagado'); setApagar(false); },
    onError: () => toast.error('Não foi possível apagar'),
  });

  // alvos de 44 pt; só o ícone aparece (na cor de ação)
  const botao = 'w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 active:opacity-50';
  return (
    <>
    <SwipeRow actionLabel="Apagar" icon={<Trash2 size={18} />} onAction={() => setApagar(true)}>
    <div className="flex items-center gap-3 py-3 pl-4 pr-1.5 rounded-2xl glass">
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-none text-white" style={{ background: 'var(--tint-fill)' }}>
        <cfg.Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="t-headline truncate" style={{ color: C.text }}>{doc.title}</p>
        <p className="t-footnote mt-0.5 truncate" style={{ color: C.muted }}>
          {[cfg.label, doc.vehicle_label,
            doc.expiry_date ? `Venc. ${format(dia(doc.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
        {st && (
          <span className="inline-block mt-1.5 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
        )}
      </div>
      <div className="flex gap-1.5 flex-none">
        {temArquivo && (
          <>
            <button aria-label={`Baixar ${doc.title}`} onClick={baixar} disabled={!!ocupado} className={botao} style={{ color: 'var(--tint)' }}>
              <Download size={19} />
            </button>
            <button aria-label={`Compartilhar ${doc.title}`} onClick={compartilhar} disabled={!!ocupado} className={botao} style={{ color: 'var(--tint)' }}>
              <Share2 size={19} />
            </button>
          </>
        )}
      </div>
    </div>
    </SwipeRow>
      {apagar && (
        <BottomSheet onClose={() => setApagar(false)} title="Apagar documento?">
          <p className="text-[0.8125rem] pt-1" style={{ color: C.muted }}>
            “{doc.title}” e o arquivo anexado serão apagados. Não dá para desfazer.
          </p>
          <div className="flex flex-col gap-2.5 mt-5">
            <PrimaryBtn disabled={removendo} onClick={() => remover()}>{removendo ? 'Apagando…' : 'Apagar'}</PrimaryBtn>
            <OutlineBtn onClick={() => setApagar(false)}>Cancelar</OutlineBtn>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

const TYPES: [string, string][] = [
  ['crlv', 'CRLV'], ['seguro', 'Seguro'], ['ipva', 'IPVA'], ['nota_fiscal', 'Nota fiscal'],
  ['garantia', 'Garantia'], ['laudo', 'Laudo'], ['outro', 'Outro'],
];

function AddDocSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('crlv');
  const [title, setTitle] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [expiry, setExpiry] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list().then(r => r.data),
  });
  const veiculo = vehicleId || vehicles[0]?.id || '';

  const escolher = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`O arquivo passa de ${MAX_MB} MB`); return; }
    setArquivo(f);
  };

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('vehicle_id', veiculo);
      fd.append('type', type);
      fd.append('title', title.trim());
      if (expiry) fd.append('expiry_date', expiry);
      if (arquivo) fd.append('file', arquivo);
      return documentsApi.upload(fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Documento salvo'); onClose(); },
    onError: (e) => toast.error(erroDaApi(e, 'Não foi possível salvar o documento')),
  });

  const campo = 'w-full px-4 py-3 rounded-2xl text-[0.8125rem] font-medium outline-none';
  const estilo = { border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card };

  return (
    <BottomSheet onClose={onClose} title="Adicionar documento">
      {vehicles.length === 0 ? (
        <p className="text-[0.8125rem] pt-2" style={{ color: C.muted }}>Cadastre um veículo antes de guardar documentos.</p>
      ) : (
      <form className="flex flex-col gap-4 pt-2" onSubmit={e => { e.preventDefault(); if (title.trim() && veiculo) salvar(); }}>
        <div>
          <p className="text-[0.75rem] font-semibold mb-2" style={{ color: C.muted }}>Tipo</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(([v, l]) => (
              <button type="button" key={v} onClick={() => setType(v)} aria-pressed={type === v}
                className="px-3.5 py-2 rounded-full text-[0.75rem] font-semibold transition-all"
                style={type === v ? { background: C.brand, color: '#fff' } : { background: C.card, color: C.muted, border: `1px solid ${C.border}` }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {vehicles.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-veiculo" className="text-[0.75rem] font-semibold" style={{ color: C.muted }}>Veículo</label>
            <select id="doc-veiculo" value={veiculo} onChange={e => setVehicleId(e.target.value)} className={campo} style={estilo}>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.plate}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="doc-titulo" className="text-[0.75rem] font-semibold" style={{ color: C.muted }}>Título</label>
          <input id="doc-titulo" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: CRLV 2026" maxLength={150}
            className={campo} style={estilo} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="doc-validade" className="text-[0.75rem] font-semibold" style={{ color: C.muted }}>Vencimento (opcional)</label>
          <input id="doc-validade" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={campo} style={estilo} />
        </div>
        <input ref={inputRef} type="file" accept={ACEITOS} className="hidden"
               onChange={e => escolher(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-4 px-3 rounded-2xl text-[0.8125rem] font-semibold"
          style={{ border: `1.5px dashed ${arquivo ? C.brand : C.border}`, color: arquivo ? C.text : C.muted }}>
          {arquivo ? <Paperclip size={17} /> : <Plus size={17} />}
          <span className="truncate">{arquivo ? arquivo.name : `Anexar arquivo (PDF ou foto, até ${MAX_MB} MB)`}</span>
        </button>
        <PrimaryBtn type="submit" disabled={!title.trim() || !veiculo || isPending}>
          {isPending ? 'Salvando…' : 'Salvar documento'}
        </PrimaryBtn>
      </form>
      )}
    </BottomSheet>
  );
}

export function DocumentsScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: docs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  return (
    <>
      <MainLayout width="wide" showNav={false} topbar={
        <Topbar title="Documentos" showBack right={
          <button aria-label="Adicionar documento" onClick={() => setShowAdd(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full active:opacity-50" style={{ color: 'var(--tint)' }}>
            <Plus size={24} />
          </button>
        } />
      }>
        <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
          {isLoading ? (
            [0, 1, 2].map(i => <Skeleton key={i} className="h-[80px] rounded-2xl" />)
          ) : isError ? (
            <FullState icon={<FileText size={42} strokeWidth={1.4} />} title="Não foi possível carregar"
              desc="Verifique sua conexão e tente de novo." primary={{ label: 'Tentar de novo', onClick: () => refetch() }} />
          ) : docs.length === 0 ? (
            <FullState
              icon={<FileText size={42} strokeWidth={1.4} />}
              title="Nenhum documento ainda"
              desc="Guarde CRLV, seguro, IPVA e notas fiscais em um só lugar, sempre à mão."
              primary={{ label: 'Adicionar documento', onClick: () => setShowAdd(true) }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {docs.map(d => <DocCard key={d.id} doc={d} />)}
              </div>
              <p className="t-footnote text-center mt-1" style={{ color: 'var(--text-3)' }}>Deslize um documento para a esquerda para apagar.</p>
            </>
          )}
        </div>
      </MainLayout>
      {showAdd && <AddDocSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}
