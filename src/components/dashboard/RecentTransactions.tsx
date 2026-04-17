import React from 'react';
import { Transaction } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categoryIcons: Record<string, string>;
  onViewAll: () => void;
}

function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, 'd MMM', { locale: es });
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  categoryIcons,
  onViewAll,
}) => {
  const { fmt } = useCurrencyFormat();
  const recent = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-color">
        <p className="text-sm font-semibold text-text-primary">Últimas transacciones</p>
        <button
          onClick={onViewAll}
          className="text-xs text-text-secondary hover:text-accent-blue transition-colors"
        >
          Ver todas →
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-1.5 text-text-secondary">
          <span className="text-2xl opacity-40">📋</span>
          <p className="text-xs">Sin transacciones en este período</p>
        </div>
      ) : (
        <div className="divide-y divide-border-color/50">
          {recent.map(tx => {
            const icon = categoryIcons[tx.category] ?? (tx.type === 'income' ? '💵' : '💳');
            const isIncome = tx.type === 'income';
            const isTransfer = tx.subtype === 'transfer_to_savings' || tx.subtype === 'transfer_from_savings';

            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {tx.description || tx.category}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate">
                    {tx.category}
                    {isTransfer && <span className="ml-1 opacity-70">· Ahorro</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-semibold tabular-nums ${
                    isIncome ? 'text-accent-green' : isTransfer ? 'text-accent-blue' : 'text-text-primary'
                  }`}>
                    {isIncome ? '+' : '-'}{fmt(tx.amount)}
                  </p>
                  <p className="text-[10px] text-text-secondary">{formatDate(tx.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
