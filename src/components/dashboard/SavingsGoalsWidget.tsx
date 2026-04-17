import React, { useEffect, useState } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { SavingsGoal, Transaction } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { getAllTransactions } from '../../lib/db';
import { differenceInMonths, parseISO } from 'date-fns';

interface SavingsGoalsWidgetProps {
  savingsGoals: SavingsGoal[];
  onNavigate: () => void;
}

function getGoalProgress(goal: SavingsGoal, allTx: Transaction[]) {
  const saved = allTx.reduce((sum, tx) => {
    if (tx.goal_id !== goal.id) return sum;
    return sum + (goal.currency === 'USD' ? (tx.amount_usd ?? 0) : tx.amount);
  }, 0);
  const pct = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
  const monthsLeft = Math.max(0, differenceInMonths(parseISO(goal.targetDate), new Date()));
  const isCompleted = pct >= 100;
  const isPastDue = parseISO(goal.targetDate) < new Date() && !isCompleted;
  return { saved, pct, monthsLeft, isCompleted, isPastDue };
}

export const SavingsGoalsWidget: React.FC<SavingsGoalsWidgetProps> = ({ savingsGoals, onNavigate }) => {
  const { fmt } = useCurrencyFormat();
  const [mounted, setMounted] = useState(false);
  const [allTx, setAllTx] = useState<Transaction[]>([]);

  function formatAmount(amount: number, currency: 'ARS' | 'USD'): string {
    return currency === 'USD'
      ? `U$S ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : fmt(amount);
  }

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    getAllTransactions().then(setAllTx).catch(() => {});
  }, [savingsGoals.length]);

  if (savingsGoals.length === 0) {
    return (
      <div className="bg-bg-card border border-border-color rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Metas</h3>
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Crear meta <ArrowRight size={12} />
          </button>
        </div>
        <div className="flex flex-col items-center py-4 gap-2">
          <span className="text-3xl">🎯</span>
          <p className="text-sm text-text-secondary text-center">
            No tenés metas creadas todavía.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-sm font-semibold text-text-primary">Metas</h3>
        <button
          onClick={onNavigate}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Ver todas <ArrowRight size={12} />
        </button>
      </div>

      {/* Goals */}
      {savingsGoals.map((goal, idx) => {
        const { saved, pct, monthsLeft, isCompleted, isPastDue } = getGoalProgress(goal, allTx);
        const barColor = isCompleted ? '#22c55e' : isPastDue ? '#ef4444' : '#3b82f6';

        return (
          <div key={goal.id} className="border-t border-border-color px-4 py-3">
            {/* Name + percentage */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Target size={13} className="shrink-0 text-text-secondary" />
                <span className="text-sm text-text-primary font-medium truncate">{goal.name}</span>
              </div>
              <span className="text-xs text-text-secondary tabular-nums ml-2 shrink-0">
                {pct.toFixed(0)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  backgroundColor: barColor,
                  transition: `width 0.7s cubic-bezier(0.16,1,0.3,1) ${idx * 80}ms`,
                }}
              />
            </div>

            {/* Amounts + status */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-secondary tabular-nums">
                {formatAmount(saved, goal.currency)} de {formatAmount(goal.targetAmount, goal.currency)}
              </p>
              {isCompleted && (
                <p className="text-xs text-accent-green font-medium">¡Completada!</p>
              )}
              {!isCompleted && isPastDue && (
                <p className="text-xs text-accent-red">Vencida</p>
              )}
              {!isCompleted && !isPastDue && monthsLeft > 0 && (
                <p className="text-xs text-text-secondary">
                  {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
