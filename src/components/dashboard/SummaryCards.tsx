import React from 'react';
import { TrendingUp, TrendingDown, Scale, PiggyBank, Wallet } from 'lucide-react';
import { Summary, DateRange } from '../../types';
import { formatARS } from '../../lib/export';
import { InfoTooltip } from '../ui/InfoTooltip';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SummaryCardsProps {
  summary: Summary | null;
  loading: boolean;
  onOpenForm?: (type: 'income' | 'expense') => void;
  dateRange?: DateRange;
  pendingRecurringAmount?: number;
  totalSavings?: number;
  projectedBalance?: number | null;
}

function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

export const SummaryCards = React.memo((props: SummaryCardsProps) => {
  const {
    summary,
    loading,
    onOpenForm,
    dateRange,
    pendingRecurringAmount = 0,
    totalSavings,
    projectedBalance,
  } = props;

  const balance = summary?.balance ?? 0;
  const balancePositive = balance >= 0;
  const savingsRate = summary && summary.total_income > 0
    ? (summary.balance / summary.total_income) * 100
    : 0;

  const totalCols = totalSavings !== undefined ? 5 : 4;

  if (loading) {
    return (
      <div className="flex flex-row gap-3">
        {Array.from({ length: totalCols }).map((_, i) => (
          <div key={i} className="bg-bg-card border border-border-color rounded-xl px-3 py-2.5 w-40">
            <div className="skeleton h-2.5 w-12 mb-2" />
            <div className="skeleton h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Period label */}
      {dateRange && (
        <p className="text-xs text-text-secondary">
          Período: {formatDateLabel(dateRange.start)} — {formatDateLabel(dateRange.end)}
        </p>
      )}

      <div className="flex flex-row gap-3">

        {/* Ingresos */}
        <div
          className="bg-bg-card border border-accent-green/20 rounded-xl px-3 py-2.5 card-hover cursor-pointer w-36 shrink-0"
          onClick={() => onOpenForm?.('income')}
          title="Agregar ingreso"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Ingresos</span>
            <div className="bg-accent-green/15 p-1 rounded-md">
              <TrendingUp size={11} className="text-accent-green" />
            </div>
          </div>
          <p className="text-base font-bold text-accent-green tabular-nums leading-tight">
            +${formatARS(summary?.total_income ?? 0)}
          </p>
        </div>

        {/* Gastos */}
        <div
          className="bg-bg-card border border-accent-red/20 rounded-xl px-3 py-2.5 card-hover cursor-pointer w-36 shrink-0"
          onClick={() => onOpenForm?.('expense')}
          title="Agregar gasto"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Gastos</span>
            <div className="bg-accent-red/15 p-1 rounded-md">
              <TrendingDown size={11} className="text-accent-red" />
            </div>
          </div>
          <p className="text-base font-bold text-accent-red tabular-nums leading-tight">
            -${formatARS(summary?.total_expenses ?? 0)}
          </p>
        </div>

        {/* Balance */}
        <div className={`bg-bg-card border ${balancePositive ? 'border-accent-blue/20' : 'border-accent-orange/20'} rounded-xl px-3 py-2.5 card-hover w-44 shrink-0`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Balance</span>
              <InfoTooltip
                title="Balance"
                content="Es la diferencia entre tus ingresos y gastos.&#10;&#10;• Positivo: Ganaste dinero en el período&#10;• Negativo: Gastaste más de lo que ganaste"
              />
            </div>
            <div className={`${balancePositive ? 'bg-accent-blue/15' : 'bg-accent-orange/15'} p-1 rounded-md`}>
              <Scale size={11} className={balancePositive ? 'text-accent-blue' : 'text-accent-orange'} />
            </div>
          </div>
          <p className={`text-base font-bold tabular-nums leading-tight ${balancePositive ? 'text-accent-blue' : 'text-accent-orange'}`}>
            {balancePositive ? '+' : '-'}${formatARS(Math.abs(balance))}
          </p>
          {pendingRecurringAmount > 0 && (
            <p className="text-[10px] text-accent-orange mt-0.5 tabular-nums leading-tight">
              Quedan ${formatARS(pendingRecurringAmount)} en recurrentes
            </p>
          )}
          {projectedBalance !== null && projectedBalance !== undefined && (
            <p className={`text-[10px] mt-0.5 tabular-nums leading-tight ${projectedBalance >= 0 ? 'text-text-secondary' : 'text-accent-orange'}`}>
              Proyectado: {projectedBalance >= 0 ? '+' : '-'}${formatARS(Math.abs(projectedBalance))}
            </p>
          )}
        </div>

        {/* Tasa de Ahorro */}
        <div className={`bg-bg-card border ${savingsRate >= 20 ? 'border-accent-green/20' : savingsRate >= 10 ? 'border-accent-yellow/20' : 'border-accent-orange/20'} rounded-xl px-3 py-2.5 card-hover w-36 shrink-0`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Tasa Ahorro</span>
              <InfoTooltip
                title="Tasa de Ahorro"
                content="Porcentaje de tus ingresos que lograste ahorrar.&#10;&#10;• 20%+: Excelente&#10;• 10-20%: Muy bien&#10;• <10%: Considera reducir gastos"
              />
            </div>
            <div className={`${savingsRate >= 20 ? 'bg-accent-green/15' : savingsRate >= 10 ? 'bg-accent-yellow/15' : 'bg-accent-orange/15'} p-1 rounded-md`}>
              <PiggyBank size={11} className={savingsRate >= 20 ? 'text-accent-green' : savingsRate >= 10 ? 'text-accent-yellow' : 'text-accent-orange'} />
            </div>
          </div>
          <p className={`text-base font-bold tabular-nums leading-tight ${savingsRate >= 20 ? 'text-accent-green' : savingsRate >= 10 ? 'text-accent-yellow' : 'text-accent-orange'}`}>
            {Math.abs(savingsRate).toFixed(1)}%
          </p>
          <div className="mt-1.5">
            <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(Math.abs(savingsRate), 100)}%`,
                  background: savingsRate >= 20
                    ? 'linear-gradient(90deg, #22c55e, #10b981)'
                    : savingsRate >= 10
                    ? 'linear-gradient(90deg, #eab308, #f97316)'
                    : 'linear-gradient(90deg, #ef4444, #f97316)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Total Ahorrado */}
        {totalSavings !== undefined && (
          <div className="bg-bg-card border border-accent-green/20 rounded-xl px-3 py-2.5 card-hover w-36 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Total Ahorrado</span>
              <div className="bg-accent-green/15 p-1 rounded-md">
                <Wallet size={11} className="text-accent-green" />
              </div>
            </div>
            <p className="text-base font-bold text-accent-green tabular-nums leading-tight">
              ${formatARS(totalSavings)}
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">Acumulado total</p>
          </div>
        )}

      </div>
    </div>
  );
});
