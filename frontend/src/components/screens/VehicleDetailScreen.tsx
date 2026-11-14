import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, QrCode, CalendarPlus, FolderOpen, Activity, Download, Plus, FileText, ChevronRight, Gauge } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { vehiclesApi, remindersApi, documentsApi, historyApi, baixarArquivo } from '../../services/api';
import { MainLayout, Topbar } from '../layout';
import { Skeleton } from '../ui';
import { useVehicleHealth } from '../../hooks/useVehicleHealth';
import { Glass, StatTile, IconCircle, PriorityBadge, CardHeader, CarIllustration, V } from '../visual';
import type { Vehicle } from '../../types';

const dia = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const ORDEM: Record<string, number> = { urgente: 0, atencao: 1, ok: 2 };
type Aba = 'geral' | 'manutencao' | 'documentos' | 'historico';
const ABAS: { k: Aba; t: string }[] = [
  { k: 'geral', t: 'Visão geral' }, { k: 'manutencao', t: 'Manutenção' }, { k: 'documentos', t: 'Documentos' }, { k: 'historico', t: 'Histórico' },
];
const COMBUSTIVEL: Record<string, string> = { flex: 'Flex', gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', eletrico: 'Elétrico', hibrido: 'Híbrido', gnv: 'GNV' };

function VisaoGeral({ v }: { v: Vehicle }) {
  const navigate = useNavigate();
  const linhas: [string, string][] = [
    ['Modelo', `${v.brand} ${v.model}`], ['Placa', v.plate], ['Ano', String(v.year)],
    ['Combustível', COMBUSTIVEL[v.fuel_type] ?? v.fuel_type], ['Quilometragem', `${v.mileage?.toLocaleString('pt-BR')} km`],
    ['Cor', v.color || '—'], ['Chassi', v.vin || '—'], ['Renavam', v.renavam || '—'],
  ];
  const acoes = [
    { icon: CalendarPlus, t: 'Agendar', to: '/agendar', destaque: true },
    { icon: QrCode, t: 'QR', to: '/qr', destaque: false },
    { icon: FolderOpen, t: 'Documentos', to: '/documentos', destaque: false },
    { icon: Activity, t: 'Saúde', to: `/saude?veiculo=${v.id}`, destaque: true },
  ];
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 lg:grid-cols-[1fr_260px] lg:gap-4">
      <Glass className="p-4">
        {linhas.map(([k, val]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-[12px]" style={{ color: V.subtle }}>{k}</span>
            <span className="text-[12.5px] text-right truncate data-mono" style={{ color: V.text }}>{val}</span>
          </div>
        ))}
      </Glass>
      <div className="grid grid-cols-2 gap-2 lg:gap-3 content-start">
        {acoes.map(a => (
          <button key={a.t} onClick={() => navigate(a.to)}
            className={`w-[68px] h-[68px] lg:w-auto lg:h-[110px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-[11.5px] ${a.destaque ? 'nav-raised' : 'chip'}`}
            style={a.destaque ? { boxShadow: '0 8px 18px rgba(204,20,0,0.25)' } : undefined}>
            <a.icon size={19} />{a.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function AbaManutencao({ vehicleId }: { vehicleId: string }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.list().then(r => r.data) });
  const lista = data.filter(r => r.vehicle_id === vehicleId).sort((a, b) => (ORDEM[a.urgency] ?? 3) - (ORDEM[b.urgency] ?? 3));
  return (
    <Glass className="p-5">
      <CardHeader title="Próximos serviços" />
      <div className="mt-3 flex flex-col">
        {isLoading ? <Skeleton className="h-24 rounded-2xl" /> : lista.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: V.subtle }}>Nenhum lembrete para este veículo.</p>
        ) : lista.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 py-3" style={{ borderTop: i ? `1px solid ${V.line}` : 'none' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: V.tile }}><Gauge size={16} color={V.muted} /></span>
            <span className="flex-1 min-w-0 text-[13.5px] truncate" style={{ color: V.text }}>{r.service_name}</span>
            <span className="text-right">
              <span className="block text-[12.5px] tabular" style={{ color: V.text }}>
                {r.next_service_date ? format(dia(r.next_service_date), 'dd MMM yyyy', { locale: ptBR })
                  : r.km_remaining != null ? `${r.next_service_km?.toLocaleString('pt-BR') ?? ''} km` : '—'}
              </span>
              <span className="block text-[11px]" style={{ color: r.urgency === 'urgente' ? V.brand : V.subtle }}>
                {r.km_remaining != null ? (r.km_remaining < 0 ? 'atrasado' : `faltam ${r.km_remaining.toLocaleString('pt-BR')} km`) : ''}
              </span>
            </span>
            <PriorityBadge urgency={r.urgency} />
          </div>
        ))}
      </div>
    </Glass>
  );
}

function AbaDocumentos({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['documents', vehicleId], queryFn: () => documentsApi.list(vehicleId).then(r => r.data) });
  const baixar = async (id: string, nome: string) => {
    try { const r = await documentsApi.download(id); baixarArquivo(r.data, nome); }
    catch { toast.error('Não foi possível baixar o arquivo'); }
  };
  return (
    <Glass className="p-5">
      <CardHeader title="Documentos" right={
        <button onClick={() => navigate('/documentos')} className="text-[13px] font-medium inline-flex items-center gap-1" style={{ color: V.brand }}>
          <Plus size={14} /> Adicionar
        </button>} />
      <div className="mt-3 flex flex-col">
        {isLoading ? <Skeleton className="h-24 rounded-2xl" /> : data.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: V.subtle }}>Nenhum documento deste veículo.</p>
        ) : data.map((d, i) => {
          const dias = d.expiry_date ? differenceInDays(dia(d.expiry_date), new Date()) : null;
          const st = dias == null ? null : dias < 0 ? { t: 'Vencido', bg: V.brandSoft, c: V.brand }
            : dias <= 30 ? { t: 'Vence logo', bg: V.warnSoft, c: '#A87800' } : { t: 'Válido', bg: V.okSoft, c: '#13804B' };
          return (
            <div key={d.id} className="flex items-center gap-3 py-3" style={{ borderTop: i ? `1px solid ${V.line}` : 'none' }}>
              <FileText size={17} color={V.muted} className="flex-none" />
              <span className="flex-1 min-w-0 text-[13.5px] truncate" style={{ color: V.text }}>{d.title}</span>
              {st && <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.c }}>{st.t}</span>}
              {d.has_file && (
                <IconCircle label={`Baixar ${d.title}`} onClick={() => baixar(d.id, d.file_name || d.title)} className="w-8 h-8">
                  <Download size={14} color={V.muted} />
                </IconCircle>
              )}
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

function AbaHistorico({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['history', vehicleId], queryFn: () => historyApi.list(vehicleId).then(r => r.data) });
  return (
    <Glass className="p-5">
      <CardHeader title="Serviços feitos" />
      <div className="mt-3 flex flex-col">
        {isLoading ? <Skeleton className="h-24 rounded-2xl" /> : data.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: V.subtle }}>Nenhum serviço registrado para este veículo.</p>
        ) : data.map((h, i) => (
          <button key={h.id} onClick={() => navigate(`/servico/${h.id}`)} className="flex items-center gap-3 py-3 text-left"
                  style={{ borderTop: i ? `1px solid ${V.line}` : 'none' }}>
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] truncate" style={{ color: V.text }}>{h.service_type}</span>
              <span className="block text-[11.5px]" style={{ color: V.subtle }}>
                {format(dia(h.service_date), 'dd/MM/yyyy')} · {h.mileage_at_service?.toLocaleString('pt-BR')} km
              </span>
            </span>
            {!!h.total_cost && <span className="text-[13px] tabular" style={{ color: V.text }}>
              {h.total_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
            <ChevronRight size={16} color={V.subtle} />
          </button>
        ))}
      </div>
    </Glass>
  );
}

export function VehicleDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('geral');

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!).then(r => r.data),
    enabled: !!id,
  });
  const { data: health } = useVehicleHealth(id);

  return (
    <MainLayout width="wide" showNav={false} topbar={
      <Topbar title={v ? `${v.brand} ${v.model}` : 'Veículo'} showBack
        right={<IconCircle label="Editar veículo" onClick={() => navigate(`/veiculo/${id}/editar`)}><Pencil size={16} /></IconCircle>} />
    }>
      <div className="px-4 pt-2 pb-8">
        {isLoading || !v ? (
          <div className="flex flex-col gap-4"><Skeleton className="h-[90px] rounded-[24px]" /><Skeleton className="h-[200px] rounded-[24px]" /></div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-5">
              {/* Métricas reais de saúde */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3">
                {health ? [{ name: 'Saúde geral', score: health.overall_score }, ...health.categories.slice(0, 4)].map(c => (
                  <StatTile key={c.name} label={c.name} value={`${c.score}%`} className="glass min-w-[112px] flex-none lg:min-w-0" />
                )) : <Skeleton className="h-[86px] w-full rounded-[18px]" />}
              </div>
              <div className="py-4 lg:py-10">
                <CarIllustration color={v.color} title={`${v.brand} ${v.model}`} className="w-full max-w-[460px] mx-auto" />
              </div>
            </div>

            <div className="lg:col-span-7">
              <div role="tablist" className="flex gap-1 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 mb-4"
                   style={{ borderBottom: `1px solid ${V.line}` }}>
                {ABAS.map(a => (
                  <button key={a.k} role="tab" aria-selected={aba === a.k} onClick={() => setAba(a.k)}
                    className="relative px-3 pb-3 pt-1 text-[13.5px] whitespace-nowrap transition-colors"
                    style={{ color: aba === a.k ? V.text : V.muted }}>
                    {a.t}
                    {aba === a.k && <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full" style={{ background: V.brand }} />}
                  </button>
                ))}
              </div>
              {aba === 'geral' && <VisaoGeral v={v} />}
              {aba === 'manutencao' && <AbaManutencao vehicleId={v.id} />}
              {aba === 'documentos' && <AbaDocumentos vehicleId={v.id} />}
              {aba === 'historico' && <AbaHistorico vehicleId={v.id} />}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
