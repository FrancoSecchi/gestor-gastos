import React, { useMemo, useState } from 'react';
import { Edit2, Trash2, Plus, Download, FileJson, PackageOpen, Paperclip } from 'lucide-react';
import { Transaction, FilterState, getCategoryColor } from '../../types';
import { formatARS } from '../../lib/export';
import { ReceiptViewer } from './ReceiptViewer';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionListProps {
  transactions: Transaction[];
  filters: FilterState;
  loading: boolean;
  categoryIcons: Record<string, string>;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExportExcel: () => void;
  onExportClaude: () => void;
}

function getDateGroup(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'Esta semana';
  if (isThisMonth(date)) return 'Este mes';
  return format(date, 'MMMM yyyy', { locale: es });
}

function groupTransactions(transactions: Transaction[]) {
  const groups: Record<string, { label: string; items: Transaction[] }> = {};
  const order: string[] = [];

  transactions.forEach(tx => {
    const key = getDateGroup(tx.date);
    if (!groups[key]) {
      groups[key] = { label: key, items: [] };
      order.push(key);
    }
    groups[key].items.push(tx);
  });

  return order.map(k => groups[k]);
}

export const TransactionList = React.memo((props: TransactionListProps) => {
  const {
    transactions,
    filters,
    loading,
    categoryIcons,
    onAdd,
    onEdit,
    onDelete,
    onClearAll,
    onExportExcel,
    onExportClaude,
  } = props;
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Apply local filters
  const filtered = useMemo(() => transactions.filter(tx => {
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.quickFilters.includes('recurring') && !tx.recurring_id) return false;
    if (filters.quickFilters.includes('savings_transfer') &&
        tx.subtype !== 'transfer_to_savings' && tx.subtype !== 'transfer_from_savings') return false;
    if (filters.quickFilters.includes('has_receipt') && !tx.receipt_path) return false;
    return true;
  }), [transactions, filters]);

  const grouped = useMemo(() => groupTransactions(filtered), [filtered]);

  // Total income excluye transfer_from_savings
  const totalIncome = filtered
    .filter(t => t.type === 'income' && t.subtype !== 'transfer_from_savings')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-text-secondary">
            <span className="text-text-primary font-semibold">{filtered.length}</span> transacción{filtered.length !== 1 ? 'es' : ''}
          </p>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-accent-green tabular-nums font-medium">+${formatARS(totalIncome)}</span>
              <span className="text-text-secondary">·</span>
              <span className="text-accent-red tabular-nums font-medium">-${formatARS(totalExpense)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-all duration-200"
          >
            <Trash2 size={12} />
            Limpiar todo
          </button>
          <button
            onClick={onExportClaude}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-card border border-border-color text-text-secondary hover:text-accent-blue hover:border-accent-blue/40 transition-all duration-200"
          >
            <FileJson size={12} />
            Exportar Markdown
          </button>
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-card border border-border-color text-text-secondary hover:text-accent-green hover:border-accent-green/40 transition-all duration-200"
          >
            <Download size={12} />
            Exportar Excel
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue text-white hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-accent-blue/20 hover:scale-105 active:scale-95"
          >
            <Plus size={12} />
            Nueva
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-7 h-7 rounded-xl" />
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 flex-1" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="p-12 flex flex-col items-center gap-4">
            <div className="animate-float">
              <PackageOpen size={48} className="text-text-secondary opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary mb-1">
                No hay transacciones
              </p>
              <p className="text-xs text-text-secondary max-w-xs">
                {filters.type !== 'all' || filters.category || filters.quickFilters.length > 0
                  ? 'No hay transacciones que coincidan con los filtros seleccionados.'
                  : 'Empezá registrando tu primer ingreso o gasto para ver todo aquí.'}
              </p>
            </div>
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-accent-blue/20 hover:scale-105 active:scale-95"
            >
              <Plus size={14} />
              Agregar primera transacción
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-card z-10">
              <tr className="border-b border-border-color">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider w-10" />
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Descripción</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Monto</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <React.Fragment key={group.label}>
                  {/* Date group header */}
                  <tr>
                    <td colSpan={7} className="px-4 pt-4 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-border-color" />
                        <span className="text-xs text-text-secondary">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Transactions */}
                  {group.items.map(tx => (
                    <tr
                      key={tx.id}
                      className="hover:bg-bg-secondary/40 transition-all duration-150 group border-t border-border-color/30"
                    >
                      {/* Category icon */}
                      <td className="pl-4 py-2.5">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: `${getCategoryColor(tx.category)}25` }}
                        >
                          {categoryIcons[tx.category] ?? '💳'}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap">
                        {format(parseISO(tx.date), "dd MMM yyyy", { locale: es })}
                      </td>

                      <td className="px-4 py-2.5">
                        {tx.subtype === 'transfer_to_savings' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-accent-green/15 text-accent-green border border-accent-green/20">
                            → Ahorros
                          </span>
                        ) : tx.subtype === 'transfer_from_savings' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-500/15 text-yellow-600 border border-yellow-500/20">
                            ← Ahorros
                          </span>
                        ) : (
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full font-semibold
                            ${tx.type === 'income'
                              ? 'bg-accent-green/15 text-accent-green border border-accent-green/20'
                              : 'bg-accent-red/15 text-accent-red border border-accent-red/20'
                            }
                          `}>
                            {tx.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCategoryColor(tx.category) }}
                          />
                          <span className="text-xs text-text-primary">{tx.category}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-xs text-text-secondary max-w-xs truncate">
                        {tx.description ?? <span className="text-border-color italic">sin descripción</span>}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div>
                          <span className={`text-sm font-bold tabular-nums ${
                            tx.type === 'income' ? 'text-accent-green' : 'text-accent-red'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}${formatARS(tx.amount)}
                          </span>
                          {tx.amount_usd && (
                            <p className="text-xs text-text-secondary tabular-nums">
                              USD ${tx.amount_usd.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
                          {tx.receipt_path && (
                            <button
                              onClick={() => setViewingReceipt(tx.receipt_path!)}
                              className="p-1.5 rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-all duration-150"
                              title="Ver comprobante"
                            >
                              <Paperclip size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-all duration-150"
                            title="Editar"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => onDelete(tx.id)}
                            className="p-1.5 rounded-lg transition-all duration-150 text-text-secondary hover:text-accent-red hover:bg-accent-red/10"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {viewingReceipt && (
        <ReceiptViewer
          filename={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
});
