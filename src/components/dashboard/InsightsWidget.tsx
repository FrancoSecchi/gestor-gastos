import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';

interface InsightsWidgetProps {
  currentTransactions: Transaction[];
  previousTransactions: Transaction[];
  totalIncome: number;
  totalSavings: number;
  streakMonths: number;
  projectedBalance: number | null;
}

interface Insight {
  key: string;
  icon: string;
  text: React.ReactNode;
}

export const InsightsWidget: React.FC<InsightsWidgetProps> = ({
  currentTransactions,
  previousTransactions,
  totalIncome,
  totalSavings,
  streakMonths,
  projectedBalance,
}) => {
  const { fmt } = useCurrencyFormat();
  const insights = useMemo(() => {
    const result: Insight[] = [];

    const expenses = currentTransactions.filter(tx => tx.type === 'expense');
    const prevExpenses = previousTransactions.filter(tx => tx.type === 'expense');

    // Sumar por categoría
    const sumByCategory = (txs: Transaction[]) => {
      const map: Record<string, number> = {};
      for (const tx of txs) {
        map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
      }
      return map;
    };

    const currentByCat = sumByCategory(expenses);
    const prevByCat = sumByCategory(prevExpenses);

    // Insight 1: categoría que más creció vs período anterior
    if (prevExpenses.length > 0) {
      let maxGrowthCat = '';
      let maxGrowthPct = 0;
      for (const [cat, curr] of Object.entries(currentByCat)) {
        const prev = prevByCat[cat] ?? 0;
        if (prev > 0) {
          const growth = ((curr - prev) / prev) * 100;
          if (growth > maxGrowthPct) {
            maxGrowthPct = growth;
            maxGrowthCat = cat;
          }
        }
      }
      if (maxGrowthCat && maxGrowthPct > 10) {
        result.push({
          key: 'growth',
          icon: '📈',
          text: (
            <>
              Gastaste{' '}
              <span className="font-semibold text-text-primary">{Math.round(maxGrowthPct)}% más</span>
              {' '}en{' '}
              <span className="font-semibold text-text-primary">{maxGrowthCat}</span>
              {' '}que el período anterior
            </>
          ),
        });
      }
    }

    // Insight 2: mayor categoría de gasto del período actual
    if (expenses.length > 0) {
      const topCat = Object.entries(currentByCat).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        result.push({
          key: 'top',
          icon: '💸',
          text: (
            <>
              Tu mayor gasto es{' '}
              <span className="font-semibold text-text-primary">{topCat[0]}</span>
              {' '}con{' '}
              <span className="font-semibold text-text-primary">{fmt(topCat[1])}</span>
            </>
          ),
        });
      }
    }

    // Insight 3: racha de ahorro
    if (streakMonths >= 2) {
      result.push({
        key: 'streak',
        icon: '🏦',
        text: (
          <>
            Llevas{' '}
            <span className="font-semibold text-text-primary">{streakMonths} meses</span>
            {' '}consecutivos con ahorro positivo
          </>
        ),
      });
    }

    // Insight 4: proyección de cierre
    if (projectedBalance !== null) {
      const positive = projectedBalance >= 0;
      result.push({
        key: 'projection',
        icon: positive ? '🎯' : '⚠️',
        text: (
          <>
            A este ritmo cerrarías el período con{' '}
            <span className={`font-semibold ${positive ? 'text-accent-green' : 'text-accent-orange'}`}>
              {positive ? '+' : '-'}{fmt(Math.abs(projectedBalance))}
            </span>
          </>
        ),
      });
    }

    return result.slice(0, 4);
  }, [currentTransactions, previousTransactions, streakMonths, projectedBalance, fmt]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Resumen rápido</p>
      <div className="flex flex-col gap-2">
        {insights.map((insight, idx) => (
          <div
            key={insight.key}
            className="flex items-start gap-2.5 text-xs text-text-secondary animate-fade-in"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <span className="text-sm leading-none mt-0.5 flex-shrink-0">{insight.icon}</span>
            <span className="leading-relaxed">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
