import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, CheckCircle2, X, ChevronRight, Car, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { historyApi } from '../../services/api';
import { Badge, SkeletonList, EmptyState, FilterChips } from '../ui';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import type { ServiceHistory } from '../../types';
import { clsx } from 'clsx';

const FILTER_OPTIONS = [
  { label: 'Todos',      value: 'all' },
  { label: '2026',       value: '2026' },
  { label: '2025',       value: '2025' },
  { label: 'Preventiva', value: 'preventiva' },
  { label: 'Corretiva',  value: 'corretiva' },
  { label: 'Revisão',    value: 'revisao' },
] as const;

type FilterValue = typeof FILTER_OPTIONS[number]['value'];

/* ─── History Card ──────────────────────────────────────── */
function HistoryCard({ item, onClick }: { item: ServiceHistory; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <div className="w-10 h-10 bg-ok-bg rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={19} className="text-ok" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-text leading-tight">{item.service_type}</p>
          <p className="text-xs text-text-muted mt-1">
            {format(new Date(item.service_date + 'T00:00:00'), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
            {' · '}
            <span className="tabular">{item.mileage_at_service?.toLocaleString('pt-BR')} km</span>
          </p>
          <p className="text-xs text-text-subtle mt-0.5">{item.vehicle_label}</p>
        </div>
        <Badge variant="ok">Concluído</Badge>
      </div>

      {/* Items */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        {(item.items || []).slice(0, 4).map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-text-2">
            <CheckCircle2 size={12} className="text-ok-mid flex-shrink-0" />
            <span>{s.description}{s.part_name ? ` — ${s.part_name}` : ''}</span>
          </div>
        ))}
        {(item.items || []).length > 4 && (
          <p className="text-xs text-text-subtle pl-5">
            +{item.items.length - 4} itens adicionais
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2">
        <div>
          <p className="text-2xs text-text-subtle font-medium uppercase tracking-wide">Total pago</p>
          <p className="text-base font-bold text-text tabular">
            {item.total_cost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-muted
                     bg-white border border-border rounded-xl px-3 py-2
                     hover:border-border-md hover:text-text-2 transition-all active:scale-95"
        >
          Ver detalhes
          <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Detail Modal ──────────────────────────────────────── */
function DetailModal({ item, onClose }: { item: ServiceHistory; onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose} title="Detalhes do Serviço">
      <div className="flex flex-col gap-5 pt-2">
        {/* Service summary card */}
        <div className="bg-ok-bg border border-ok-border rounded-xl p-4">
          <p className="font-bold text-base text-text mb-1">{item.service_type}</p>
          <p className="text-sm text-text-muted">
            {format(new Date(item.service_date + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm text-text-muted">{item.vehicle_label}</p>
          <div className="flex items-center gap-2 mt-2">
            <Car size={13} className="text-text-subtle" />
            <span className="text-xs text-text-subtle tabular">{item.mileage_at_service?.toLocaleString('pt-BR')} km no momento</span>
          </div>
        </div>

        {/* Service items */}
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
            Serviços realizados
          </p>
          <div className="flex flex-col gap-2">
            {(item.items || []).map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-border rounded-xl p-3">
                <CheckCircle2 size={16} className="text-ok-mid mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text">{s.description}</p>
                  {s.part_replaced && s.part_name && (
                    <p className="text-xs text-text-muted mt-0.5">Peça: {s.part_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mechanic notes */}
        {item.mechanic_notes && (
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
              Observações do mecânico
            </p>
            <div className="bg-surface-3 rounded-xl p-4 text-sm text-text-2 leading-relaxed">
              {item.mechanic_notes}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center bg-white border border-border rounded-xl p-4">
          <span className="font-bold text-base text-text">Total pago</span>
          <span className="text-xl font-bold text-brand tabular">
            {item.total_cost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ─── History Screen ────────────────────────────────────── */
export function HistoryScreen() {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterValue>('all');
  const [detail, setDetail]   = useState<ServiceHistory | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.list().then(r => r.data),
  });

  const filtered = history.filter(item => {
    const matchSearch = !search || item.service_type.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === '2026' && item.service_date?.startsWith('2026')) ||
      (filter === '2025' && item.service_date?.startsWith('2025'));
    return matchSearch && matchFilter;
  });

  return (
    <>
      <MainLayout
        topbar={
          <Topbar
            title="Histórico de Serviços"
            showBack
            right={
              <button className="w-9 h-9 flex items-center justify-center text-text-muted
                                 hover:bg-surface-3 rounded-xl transition-colors">
                <Download size={18} />
              </button>
            }
          />
        }
      >
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Search bar */}
          <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-border
                          rounded-xl px-3.5 py-2.5 shadow-xs
                          focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(204,20,0,0.10)]
                          transition-all duration-150">
            <Search size={16} className="text-text-subtle flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar serviços, peças..."
              className="flex-1 border-none outline-none text-sm text-text bg-transparent
                         placeholder:text-text-ghost font-sans"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="text-text-subtle hover:text-text transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters */}
          <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

          {/* Results count */}
          {!isLoading && (
            <p className="text-xs text-text-subtle px-0.5">
              {filtered.length} {filtered.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </p>
          )}

          {/* List */}
          {isLoading ? (
            <SkeletonList count={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={34} />}
              title="Nenhum serviço encontrado"
              description={search ? `Sem resultados para "${search}"` : 'Seu histórico de serviços aparecerá aqui após a conclusão do primeiro atendimento.'}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(item => (
                <HistoryCard key={item.id} item={item} onClick={() => setDetail(item)} />
              ))}
            </div>
          )}
        </div>
      </MainLayout>

      <AnimatePresence>
        {detail && <DetailModal item={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </>
  );
}
