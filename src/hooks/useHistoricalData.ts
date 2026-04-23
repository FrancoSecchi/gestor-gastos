import { useState, useEffect, useCallback } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllTransactions } from '../lib/db';
import { Rule502030Mapping } from '../lib/budgetRuleMapping';
import { Rule502030Group } from '../types';

export interface MonthlyDataPoint {
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
  byCategory: Record<string, number>;
  byGroup: Record<Rule502030Group, number>;
}

interface UseHistoricalDataResult {
  data: MonthlyDataPoint[];
  categories: string[];
  loading: boolean;
  refresh: () => void;
}

function getCategoryGroup(category: string, mapping: Rule502030Mapping): Rule502030Group {
  for (const [group, cats] of Object.entries(mapping) as [Rule502030Group, string[]][]) {
    if (cats.includes(category)) return group;
  }
  return 'Deseos';
}

export function useHistoricalData(
  months: number,
  mapping: Rule502030Mapping
): UseHistoricalDataResult {
  const [data, setData] = useState<MonthlyDataPoint[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getAllTransactions()
      .then(all => {
        if (cancelled) return;

        const now = new Date();
        const monthPoints: MonthlyDataPoint[] = [];
        const categorySet = new Set<string>();

        for (let i = months - 1; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthKey = format(monthDate, 'yyyy-MM');
          const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
          const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

          const monthTxs = all.filter(tx => tx.date >= start && tx.date <= end);

          const point: MonthlyDataPoint = {
            monthKey,
            monthLabel: format(monthDate, 'MMM yy', { locale: es }),
            income: 0,
            expenses: 0,
            balance: 0,
            byCategory: {},
            byGroup: { Necesidades: 0, Deseos: 0, 'Ahorro/Inversión': 0 },
          };

          for (const tx of monthTxs) {
            if (tx.type === 'income') {
              point.income += tx.amount;
            } else {
              point.expenses += tx.amount;
              point.byCategory[tx.category] = (point.byCategory[tx.category] ?? 0) + tx.amount;
              const group = getCategoryGroup(tx.category, mapping);
              point.byGroup[group] += tx.amount;
              categorySet.add(tx.category);
            }
          }

          point.balance = point.income - point.expenses;
          monthPoints.push(point);
        }

        setData(monthPoints);
        setCategories(Array.from(categorySet).sort());
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [months, mapping, tick]);

  return { data, categories, loading, refresh };
}
