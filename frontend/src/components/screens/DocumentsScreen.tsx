import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Share2, Plus, FileText, Shield, Receipt, FileCheck, Car } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { documentsApi } from '../../services/api';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { Skeleton } from '../ui';
import { C, FullState, PrimaryBtn } from '../ui/pro';
import type { VehicleDocument } from '../../types';

// Tipos diferenciados pelo ÍCONE (forma), com acento único da marca — sem
// tiles multicoloridos. O status (válido/vencido) segue colorido, pois é semântico.
const TYPE_CFG: Record<string, { bg: string; color: string; Icon: any; label: string }> = {
  crlv:        { bg: C.borderSoft, color: C.brand, Icon: Car,       label: 'CRLV' },
  seguro:      { bg: C.borderSoft, color: C.brand, Icon: Shield,    label: 'Seguro' },
  ipva:        { bg: C.borderSoft, color: C.brand, Icon: Receipt,   label: 'IPVA' },
  garantia:    { bg: C.borderSoft, color: C.brand, Icon: FileCheck, label: 'Garantia' },
  nota_fiscal: { bg: C.borderSoft, color: C.brand, Icon: Receipt,   label: 'Nota fiscal' },
  laudo:       { bg: C.borderSoft, color: C.muted, Icon: FileText,  label: 'Laudo' },
  outro:       { bg: C.borderSoft, color: C.muted, Icon: FileText,  label: 'Documento' },
};

function statusOf(expiry?: string) {
  if (!expiry) return null;
  const days = differenceInDays(new Date(expiry), new Date());
  if (days < 0)   return { label: 'Vencido',  bg: C.redBg,   color: C.brand };
  if (days <= 30) return { label: 'A vencer', bg: '#FFF3D6', color: '#C98A00' };
  return { label: 'Válido', bg: C.greenBg, color: C.greenDk };
}

function DocCard({ doc }: { doc: VehicleDocument }) {
  const cfg = TYPE_CFG[doc.type] ?? TYPE_CFG.outro;
  const st = statusOf(doc.expiry_date);
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-[16px]" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-none" style={{ background: cfg.bg }}>
        <cfg.Icon size={20} color={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: C.text }}>{doc.title}</p>
        <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>
          {doc.expiry_date
            ? `Venc. ${format(new Date(doc.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}`
            : doc.file_size_kb ? `${doc.file_size_kb} KB` : cfg.label}
        </p>
        {st && (
          <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-none">
        <button aria-label="Baixar documento" onClick={() => toast.success('Baixando documento...')}
          className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: C.bg }}>
          <Download size={15} color={C.muted} />
        </button>
        <button aria-label="Compartilhar documento" onClick={() => toast('Compartilhando...', { icon: '🔗' })}
          className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: C.bg }}>
          <Share2 size={15} color={C.muted} />
        </button>
      </div>
    </div>
  );
}

function AddDocSheet({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState('crlv');
  const [title, setTitle] = useState('');
  const TYPES: [string, string][] = [['crlv','CRLV'],['seguro','Seguro'],['ipva','IPVA'],['nota_fiscal','Nota fiscal'],['garantia','Garantia'],['outro','Outro']];
  return (
    <BottomSheet onClose={onClose} title="Adicionar documento">
      <div className="flex flex-col gap-4 pt-2">
        <div>
          <p className="text-[11.5px] font-semibold mb-2" style={{ color: C.muted }}>Tipo</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(([v, l]) => (
              <button key={v} onClick={() => setType(v)}
                className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all"
                style={type === v ? { background: C.brand, color: '#fff' } : { background: C.card, color: C.muted, border: `1px solid ${C.border}` }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: CRLV 2026"
            className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
            style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
        </div>
        <button onClick={() => toast('Selecionar arquivo (em breve)', { icon: '📎' })}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-[13px] text-[13.5px] font-semibold"
          style={{ border: `1.5px dashed ${C.border}`, color: C.muted }}>
          <Plus size={17} /> Selecionar arquivo (PDF, JPG)
        </button>
        <PrimaryBtn disabled={!title.trim()} onClick={() => { toast.success('Documento adicionado!'); onClose(); }}>
          Salvar documento
        </PrimaryBtn>
      </div>
    </BottomSheet>
  );
}

export function DocumentsScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  return (
    <>
      <MainLayout showNav={false} topbar={
        <Topbar title="Documentos" showBack right={
          <button aria-label="Adicionar documento" onClick={() => setShowAdd(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Plus size={18} color={C.text} />
          </button>
        } />
      }>
        <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
          {isLoading ? (
            [0,1,2].map(i => <Skeleton key={i} className="h-[80px] rounded-[16px]" />)
          ) : docs.length === 0 ? (
            <FullState
              icon={<FileText size={42} strokeWidth={1.4} />}
              title="Nenhum documento ainda"
              desc="Guarde CRLV, seguro, IPVA e notas fiscais em um só lugar, sempre à mão."
              primary={{ label: 'Adicionar documento', onClick: () => setShowAdd(true) }}
            />
          ) : (
            docs.map(d => <DocCard key={d.id} doc={d} />)
          )}
        </div>
      </MainLayout>
      {showAdd && <AddDocSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}
