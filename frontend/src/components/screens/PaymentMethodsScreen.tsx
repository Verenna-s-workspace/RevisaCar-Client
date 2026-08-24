import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import { C, FONT_HEAD, SectionLabel, CardGroup, PrimaryBtn } from '../ui/pro';

/* ─── Add card sheet ────────────────────────────── */
function AddCardSheet({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ number: '', name: '', exp: '', cvv: '' });
  const field = (k: keyof typeof form, label: string, ph: string, max?: number) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-semibold" style={{ color: C.muted }}>{label}</label>
      <input
        value={form[k]} maxLength={max}
        onChange={e => setForm(s => ({ ...s, [k]: e.target.value }))}
        placeholder={ph}
        className="w-full px-4 py-3 rounded-[13px] text-[13.5px] font-medium outline-none"
        style={{ border: `1px solid ${C.borderSoft}`, color: C.text, background: C.card }} />
    </div>
  );
  return (
    <BottomSheet onClose={onClose} title="Adicionar cartão">
      <div className="flex flex-col gap-3.5 pt-2">
        {field('number', 'Número do cartão', '0000 0000 0000 0000', 19)}
        {field('name', 'Nome do titular', 'Como está no cartão')}
        <div className="flex gap-3">
          <div className="flex-1">{field('exp', 'Validade', 'MM/AA', 5)}</div>
          <div className="flex-1">{field('cvv', 'CVV', '123', 4)}</div>
        </div>
        <div className="mt-1">
          <PrimaryBtn onClick={() => { toast.success('Cartão adicionado!'); onClose(); }}>
            Salvar cartão
          </PrimaryBtn>
        </div>
      </div>
    </BottomSheet>
  );
}

export function PaymentMethodsScreen() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <MainLayout showNav={false} topbar={<Topbar title="Pagamento" showBack />}>
        <div className="px-4 pt-4 pb-8 flex flex-col gap-5">

          {/* Primary card */}
          <div className="rounded-[18px] p-5 relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg,#1B1E25,#0E1014)', minHeight: 178 }}>
            <div style={{ position:'absolute', top:-40, right:-30, width:160, height:160, borderRadius:'50%',
                          background:'radial-gradient(circle,rgba(204,20,0,.25),transparent 70%)' }} />
            <div className="flex items-center justify-between relative">
              <span className="text-[13px] font-bold tracking-wide text-white" style={{ fontFamily: FONT_HEAD }}>VISA</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>Principal</span>
            </div>
            <p className="text-[19px] font-semibold tracking-[2px] text-white mt-7 relative tabular">
              ••••  ••••  ••••  4242
            </p>
            <div className="flex items-end justify-between mt-5 relative">
              <div>
                <p className="text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,.5)' }}>TITULAR</p>
                <p className="text-[12.5px] font-medium text-white mt-0.5">João Silva</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,.5)' }}>VALIDADE</p>
                <p className="text-[12.5px] font-medium text-white mt-0.5">08/27</p>
              </div>
            </div>
          </div>

          {/* Other methods */}
          <div>
            <SectionLabel>Outras formas</SectionLabel>
            <CardGroup>
              <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                <div className="w-10 h-7 rounded-[6px] flex items-center justify-center flex-none"
                     style={{ background: '#EAF1FB' }}>
                  <span className="text-[9px] font-extrabold" style={{ color: C.info }}>MC</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold" style={{ color: C.text }}>Mastercard •••• 8888</p>
                  <p className="text-[11px]" style={{ color: C.subtle }}>Vence 03/26</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="w-10 h-7 rounded-[6px] flex items-center justify-center flex-none"
                     style={{ background: C.greenBg }}>
                  <span className="text-[12px] font-extrabold" style={{ color: C.greenDk }}>Pix</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold" style={{ color: C.text }}>Pix</p>
                  <p className="text-[11px]" style={{ color: C.subtle }}>Pagamento instantâneo</p>
                </div>
                <Check size={18} color={C.green} />
              </div>
            </CardGroup>
          </div>

          <button onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-[14px] rounded-[14px] font-bold text-[14px]"
            style={{ border: `1.5px dashed ${C.border}`, color: C.brand }}>
            <Plus size={18} /> Adicionar cartão
          </button>

        </div>
      </MainLayout>
      {showAdd && <AddCardSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}
