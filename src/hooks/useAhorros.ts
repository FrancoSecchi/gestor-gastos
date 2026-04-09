import { useState, useEffect, useCallback } from 'react';
import { getAllTransactions, logError } from '../lib/db';
import { Transaction, Rule502030Group } from '../types';

export type Rule502030Mapping = Record<Rule502030Group, string[]>;

export interface MonthlySavings {
  month: string;   // 'YYYY-MM'
  label: string;   // 'Ene 25'
  savings: number;
  income: number;
  target: number;  // 20% del ingreso
  cumulative: number;
  cumulativeUsd: number;
  usd: number;
}

export interface AhorrosData {
  monthly: MonthlySavings[];
  currentMonthData: MonthlySavings;
  totalSavings: number;
  totalUsd: number;
  avgMonthlySavings: number;
  avgSavingsRate: number;
  bestMonth: MonthlySavings | null;
  streakMonths: number;
  savingsCategories: string[];
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${year.slice(2)}`;
}

/** Genera todos los meses entre start y end (inclusive), formato 'YYYY-MM'. */
function fillMonthRange(start: string, end: string): string[] {
  const result: string[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

function computeAhorros(
  transactions: Transaction[],
  savingsCategories: string[]
): AhorrosData {
  const byMonth: Record<string, { savings: number; income: number; usd: number }> = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { savings: 0, income: 0, usd: 0 };

    if (tx.type === 'income') {
      byMonth[month].income += tx.amount;
    } else if (savingsCategories.includes(tx.category)) {
      byMonth[month].savings += tx.amount;
      byMonth[month].usd += tx.amount_usd ?? 0;
    }
  }

  // Siempre incluir el mes actual
  const nowStr = currentMonthStr();
  if (!byMonth[nowStr]) byMonth[nowStr] = { savings: 0, income: 0, usd: 0 };

  // Rellenar huecos entre el primer mes con datos y el mes actual
  const knownMonths = Object.keys(byMonth).sort();
  const allMonths = fillMonthRange(knownMonths[0], nowStr);
  for (const m of allMonths) {
    if (!byMonth[m]) byMonth[m] = { savings: 0, income: 0, usd: 0 };
  }

  const months = Object.keys(byMonth).sort();
  let cumulative = 0;
  let cumulativeUsd = 0;

  const monthly: MonthlySavings[] = months.map(month => {
    const d = byMonth[month];
    cumulative += d.savings;
    cumulativeUsd += d.usd;
    return {
      month,
      label: formatMonthLabel(month),
      savings: d.savings,
      income: d.income,
      target: d.income > 0 ? d.income * 0.2 : 0,
      cumulative,
      cumulativeUsd,
      usd: d.usd,
    };
  });

  // Mes actual: buscamos por el string real, no por posición
  const currentMonthEntry = monthly.find(m => m.month === nowStr) ?? monthly[monthly.length - 1];

  const savingMonths = monthly.filter(m => m.savings > 0);
  const avgMonthlySavings = monthly.length > 0
    ? monthly.reduce((acc, m) => acc + m.savings, 0) / monthly.length
    : 0;

  const rateMonths = monthly.filter(m => m.income > 0);
  const avgSavingsRate = rateMonths.length > 0
    ? (rateMonths.reduce((acc, m) => acc + m.savings / m.income, 0) / rateMonths.length) * 100
    : 0;

  const bestMonth = savingMonths.length > 0
    ? savingMonths.reduce((best, m) => m.savings > best.savings ? m : best, savingMonths[0])
    : null;

  // Racha: contamos hacia atrás desde el mes anterior al actual (o el actual si ya tiene ahorro).
  // Si el mes actual no tiene ahorro todavía, no penalizamos; empezamos desde el mes anterior.
  let streakStartIdx = monthly.length - 1;
  if (monthly[streakStartIdx].month === nowStr && monthly[streakStartIdx].savings === 0) {
    streakStartIdx--;
  }
  let streakMonths = 0;
  for (let i = streakStartIdx; i >= 0; i--) {
    if (monthly[i].savings > 0) streakMonths++;
    else break;
  }

  return {
    monthly,
    currentMonthData: currentMonthEntry,
    totalSavings: cumulative,
    totalUsd: cumulativeUsd,
    avgMonthlySavings,
    avgSavingsRate,
    bestMonth,
    streakMonths,
    savingsCategories,
  };
}

export function useAhorros(mapping?: Rule502030Mapping | null) {
  const [data, setData] = useState<AhorrosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const savingsCategories: string[] = mapping
    ? (mapping['Ahorro/Inversión'] ?? ['Ahorro', 'Inversión'])
    : ['Ahorro', 'Inversión'];

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllTransactions();
      setData(computeAhorros(all, savingsCategories));
    } catch (e) {
      await logError('useAhorros', e);
      setError(e instanceof Error ? e.message : 'Error al cargar ahorros');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savingsCategories)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
