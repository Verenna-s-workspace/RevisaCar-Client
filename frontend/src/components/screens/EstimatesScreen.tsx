import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Check, X, ChevronRight, MessageSquare, Info, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { estimatesApi } from '../../services/api';
import { EstimateBadge, Button, SkeletonList, EmptyState, FilterChips, Textarea } from '../ui';
import { MainLayout, Topbar, BottomSheet } from '../layout';
import type { Estimate, EstimateStatus } from '../../types';
import { clsx } from 'clsx';

const FILTER_OPTIONS = [
  { label: 'Todos',     value: 'all'       },
  { label: 'Pendentes', value: 'pendente'  },
  { label: 'Aprovados', value: 'aprovado'  },
  { label: 'Recusados', value: 'rejeitado' },
  { label: 'Expirados', value: 'expirado'  },
] as const;
type FilterValue = typeof FILTER_OPTIONS[number]['value'];

/* ─── Action Sheet ──────────────────────────────────────── */
function ActionSheet({ estimate, action, onClose, onConfirm, loading }: {
  estimate: Estimate;
  action: 'aprovar' | 'rejeitar';
  onClose: () => void;
  onConfirm: (comment: string) => void;
  loading: boolean;
}) {
  const [comment, setComment] = useState('');
  const isApprove = action === 'aprovar';

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col gap-5 pt-2">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className={clsx(
            'w-16 h-16 rounded-2xl flex items-center justify-center',
            isApprove ? 'bg-ok-bg' : 'bg-crit-bg'
          )}>
            {isApprove
              ? <Check size={30} className="text-ok" strokeWidth={2.5} />
              : <X size={30} className="text-crit" strokeWidth={2.5} />
            }
          </div>
          <div className="text-center">
            <p className="font-bold text-base text-text">
              {isApprove ? 'Aprovar orçamento?' : 'Recusar orçamento?'}
            </p>
            <p className="text-sm text-text-muted mt-0.5">
              {estimate.number} ·{' '}
              <span className="font-semibold text-text tabular">
                {estimate.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
          </div>
        </div>

        {/* Comment */}
        <Textarea
          label={isApprove ? 'Mensagem para o mecânico (opcional)' : 'Motivo da recusa (opcional)'}
          placeholder={isApprove
            ? 'Ex: Pode iniciar na próxima semana...'
            : 'Ex: Vou buscar outro orçamento...'
          }
          value={comment}
          onChange={e => setComment(e.target.value)}
        />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Voltar</Button>
          <Button
            fullWidth
            variant={isApprove ? 'success' : 'danger'}
            loading={loading}
            onClick={() => onConfirm(comment)}
          >
            {isApprove ? <><Check size={16} /> Aprovar</> : <><X size={16} /> Recusar</>}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ─── Detail Sheet ──────────────────────────────────────── */
function DetailSheet({ estimate, onClose, onAction }: {
  estimate: Estimate;
  onClose: () => void;
  onAction: (a: 'aprovar' | 'rejeitar') => void;
}) {
  const isPending = estimate.status === 'pendente';
  const isExpired = estimate.status === 'expirado';

  return (
    <BottomSheet onClose={onClose} title={estimate.number}>
      <div className="flex flex-col gap-5 pt-2">
        {/* Meta */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-text">{estimate.vehicle_label}</p>
            <p className="text-xs text-text-subtle mt-0.5">
              Emitido em {format(new Date(estimate.created_at), "d MMM yyyy", { locale: ptBR })}
            </p>
            {estimate.valid_until && (
              <div className="flex items-center gap-1.5 mt-1">
                <Clock size={12} className={isExpired ? 'text-crit' : 'text-text-subtle'} />
                <p className={clsx('text-xs', isExpired ? 'text-crit font-semibold' : 'text-text-subtle')}>
                  {isExpired
                    ? 'Expirado'
                    : `Válido até ${format(new Date(estimate.valid_until + 'T00:00:00'), "d MMM", { locale: ptBR })}`
                  }
                </p>
              </div>
            )}
          </div>
          <EstimateBadge status={estimate.status} />
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Itens</p>
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {estimate.items.map((item, i) => (
              <div key={item.id}
                className="flex justify-between items-start px-4 py-3 border-b border-border last:border-0">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold text-text leading-snug">{item.description}</p>
                  <p className="text-xs text-text-subtle mt-0.5">
                    {item.item_type === 'peca' ? 'Peça' : item.item_type === 'mao_de_obra' ? 'Mão de obra' : 'Outro'}
                    {item.quantity !== 1 && ` · ${item.quantity}×`}
                    {' · '}{item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.
                  </p>
                </div>
                <p className="text-sm font-bold text-text flex-shrink-0 tabular">
                  {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-surface-2 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm text-text-muted">
            <span>Subtotal</span>
            <span className="tabular">{estimate.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          {estimate.discount > 0 && (
            <div className="flex justify-between text-sm text-ok">
              <span>Desconto</span>
              <span className="tabular">−{estimate.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          )}
          <div className="h-px bg-border-md my-1" />
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-base text-text">Total</span>
            <span className="text-xl font-bold text-brand tabular">
              {estimate.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="flex items-start gap-3 bg-info-bg border border-info-border rounded-xl p-4">
            <Info size={16} className="text-info mt-0.5 flex-shrink-0" />
            <p className="text-sm text-info leading-relaxed">{estimate.notes}</p>
          </div>
        )}

        {/* CTA */}
        {isPending && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onAction('aprovar')}
              className="flex items-center justify-center gap-2 py-3.5 bg-ok text-white
                         rounded-xl font-bold text-sm hover:brightness-110 transition-all active:scale-[0.97]"
            >
              <Check size={16} strokeWidth={2.5} /> Aprovar
            </button>
            <button
              onClick={() => onAction('rejeitar')}
              className="flex items-center justify-center gap-2 py-3.5 bg-crit-bg text-crit
                         border border-crit-border rounded-xl font-bold text-sm
                         hover:bg-crit/10 transition-all active:scale-[0.97]"
            >
              <X size={16} strokeWidth={2.5} /> Recusar
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Estimate Card ─────────────────────────────────────── */
function EstimateCard({ estimate, onView, onAction }: {
  estimate: Estimate;
  onView: () => void;
  onAction: (a: 'aprovar' | 'rejeitar') => void;
}) {
  const isPending = estimate.status === 'pendente';
  const isExpired = estimate.status === 'expirado' || estimate.status === 'rejeitado';

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity',
      isPending ? 'border-warn-border' : 'border-border',
      isExpired && 'opacity-60',
    )}>
      {/* Pending indicator strip */}
      {isPending && <div className="h-1 bg-gradient-to-r from-warn-mid to-warn" />}

      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          isPending ? 'bg-warn-bg' :
          estimate.status === 'aprovado' ? 'bg-ok-bg' : 'bg-surface-3'
        )}>
          <FileText size={18} className={
            isPending ? 'text-warn' :
            estimate.status === 'aprovado' ? 'text-ok' : 'text-text-muted'
          } />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-text">{estimate.number}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{estimate.vehicle_label}</p>
          <p className="text-xs text-text-subtle mt-0.5">
            {format(new Date(estimate.created_at), "d MMM yyyy", { locale: ptBR })}
            {isPending && estimate.valid_until && (
              <span className="text-warn font-semibold">
                {' · '}Válido até {format(new Date(estimate.valid_until + 'T00:00:00'), "d MMM", { locale: ptBR })}
              </span>
            )}
          </p>
        </div>
        <EstimateBadge status={estimate.status} />
      </div>

      {/* Items summary */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        {estimate.items.slice(0, 2).map(item => (
          <div key={item.id} className="flex justify-between items-baseline">
            <p className="text-xs text-text-2 flex-1 truncate pr-3">{item.description}</p>
            <p className="text-xs font-semibold text-text flex-shrink-0 tabular">
              {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        ))}
        {estimate.items.length > 2 && (
          <p className="text-xs text-text-subtle">+{estimate.items.length - 2} itens</p>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-border mt-1">
          <span className="text-sm font-bold text-text">Total</span>
          <span className={clsx(
            'text-base font-bold tabular',
            isPending ? 'text-brand' :
            estimate.status === 'aprovado' ? 'text-ok' : 'text-text-muted'
          )}>
            {estimate.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Footer */}
      {isPending ? (
        <div className="flex gap-2 p-3 border-t border-border bg-surface-2">
          <button
            onClick={() => onAction('aprovar')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-ok
                       text-white rounded-xl font-bold text-xs hover:brightness-110
                       transition-all active:scale-[0.97]"
          >
            <Check size={14} strokeWidth={2.5} /> Aprovar
          </button>
          <button
            onClick={() => onAction('rejeitar')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-crit-bg
                       text-crit border border-crit-border rounded-xl font-bold text-xs
                       hover:bg-crit/10 transition-all active:scale-[0.97]"
          >
            <X size={14} strokeWidth={2.5} /> Recusar
          </button>
          <button
            onClick={onView}
            className="w-10 flex items-center justify-center py-2.5 bg-white border border-border
                       rounded-xl text-text-muted hover:border-border-md transition-all"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={onView}
          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-border
                     bg-surface-2 text-xs font-semibold text-text-muted
                     hover:bg-surface-3 transition-colors"
        >
          Ver detalhes completos <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

/* ─── Estimates Screen ──────────────────────────────────── */
export function EstimatesScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [detail, setDetail] = useState<Estimate | null>(null);
  const [action, setAction] = useState<{ estimate: Estimate; type: 'aprovar' | 'rejeitar' } | null>(null);

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => estimatesApi.list().then(r => r.data),
  });

  const { mutate: doAction, isPending } = useMutation({
    mutationFn: ({ estimate, type, comment }: { estimate: Estimate; type: 'aprovar' | 'rejeitar'; comment: string }) =>
      type === 'aprovar'
        ? estimatesApi.approve(estimate.id, comment)
        : estimatesApi.reject(estimate.id, comment),
    onSuccess: (_, { type }) => {
      toast.success(type === 'aprovar' ? '✓ Orçamento aprovado!' : 'Orçamento recusado.');
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setAction(null);
      setDetail(null);
    },
    onError: () => toast.error('Erro ao processar. Tente novamente.'),
  });

  const filtered = filter === 'all' ? estimates : estimates.filter(e => e.status === filter);
  const pendingCount = estimates.filter(e => e.status === 'pendente').length;

  return (
    <>
      <MainLayout topbar={<Topbar title="Orçamentos" showBack />}>
        <div className="px-4 pt-4 flex flex-col gap-4">

          {/* Pending alert */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-warn-bg border border-warn-border
                            rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-warn-mid/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-warn" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-warn">
                  {pendingCount} orçamento{pendingCount > 1 ? 's' : ''} aguardando aprovação
                </p>
                <p className="text-xs text-warn/70 mt-0.5">Responda antes do prazo expirar</p>
              </div>
            </div>
          )}

          <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

          {isLoading ? (
            <SkeletonList count={2} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={34} />}
              title={filter === 'pendente' ? 'Nenhum orçamento pendente' : 'Nenhum orçamento'}
              description="Seus orçamentos aparecerão aqui quando o mecânico enviar uma proposta."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(est => (
                <EstimateCard
                  key={est.id}
                  estimate={est}
                  onView={() => setDetail(est)}
                  onAction={type => setAction({ estimate: est, type })}
                />
              ))}
            </div>
          )}
        </div>
      </MainLayout>

      <AnimatePresence>
        {detail && !action && (
          <DetailSheet
            estimate={detail}
            onClose={() => setDetail(null)}
            onAction={type => { setAction({ estimate: detail, type }); setDetail(null); }}
          />
        )}
        {action && (
          <ActionSheet
            estimate={action.estimate}
            action={action.type}
            onClose={() => setAction(null)}
            loading={isPending}
            onConfirm={comment => doAction({ ...action, comment })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
