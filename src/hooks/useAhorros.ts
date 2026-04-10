import { useState, useEffect, useCallback } from 'react';
import { getAllTransactions, getSetting, setSetting, logError } from '../lib/db';
import { Transaction, Rule502030Group } from '../types';

export type Rule502030Mapping = Record<Rule502030Group, string[]>;

export interface MonthlySavings {
  month: string;        // 'YYYY-MM'
  label: string;        // 'Ene 25'
  deposited: number;    // bruto depositado en ahorros
  withdrawn: number;    // retirado de ahorros
  net: number;          // deposited - withdrawn
  income: number;       // ingresos reales del mes (excl. retiros)
  target: number;       // 20% del ingreso
  cumulative: number;   // saldo acumulado neto
  cumulativeUsd: number;
  usd: number;          // USD depositado (amount_usd sum)
}

export interface InitialBalanceMeta {
  currency: 'ARS' | 'USD';
  amount: number;        // el valor tal como lo ingresó el usuario
  dollarType?: string;   // 'blue', 'oficial', etc. — solo si currency === 'USD'
  ars: number;           // equivalente ARS calculado al momento de guardar
}

export interface AhorrosData {
  monthly: MonthlySavings[];
  currentMonthData: MonthlySavings;
  totalSavings: number;     // saldo neto (deposited - withdrawn + initialBalance)
  totalDeposited: number;
  totalWithdrawn: number;
  totalUsd: number;
  avgMonthlySavings: number;
  avgSavingsRate: number;
  bestMonth: MonthlySavings | null;
  streakMonths: number;
  savingsCategories: string[];
  movements: Transaction[];  // todas las transacciones de ahorro/retiro
  initialBalance: number;
  initialBalanceMeta: InitialBalanceMeta | null;
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
  savingsCategories: string[],
  initialBalance: number = 0,
  initialBalanceMeta: InitialBalanceMeta | null = null
): AhorrosData {
  type MonthBucket = { deposited: number; withdrawn: number; income: number; usd: number };
  const byMonth: Record<string, MonthBucket> = {};

  const movements: Transaction[] = [];

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { deposited: 0, withdrawn: 0, income: 0, usd: 0 };

    if (tx.subtype === 'transfer_from_savings') {
      byMonth[month].withdrawn += tx.amount;
      movements.push(tx);
    } else if (tx.type === 'income') {
      byMonth[month].income += tx.amount;
    } else if (tx.subtype === 'transfer_to_savings' || savingsCategories.includes(tx.category)) {
      byMonth[month].deposited += tx.amount;
      byMonth[month].usd += tx.amount_usd ?? 0;
      movements.push(tx);
    }
  }

  // Asegurar que el mes actual siempre está presente
  const nowStr = currentMonthStr();
  if (!byMonth[nowStr]) byMonth[nowStr] = { deposited: 0, withdrawn: 0, income: 0, usd: 0 };

  // Rellenar huecos para que el streak pueda detectarlos
  const knownMonths = Object.keys(byMonth).sort();
  for (const m of fillMonthRange(knownMonths[0], nowStr)) {
    if (!byMonth[m]) byMonth[m] = { deposited: 0, withdrawn: 0, income: 0, usd: 0 };
  }

  const months = Object.keys(byMonth).sort();
  let cumulative = initialBalance;
  let cumulativeUsd = 0;

  const monthly: MonthlySavings[] = months.map(month => {
    const d = byMonth[month];
    const net = d.deposited - d.withdrawn;
    cumulative += net;
    cumulativeUsd += d.usd;
    return {
      month,
      label: formatMonthLabel(month),
      deposited: d.deposited,
      withdrawn: d.withdrawn,
      net,
      income: d.income,
      target: d.income > 0 ? d.income * 0.2 : 0,
      cumulative,
      cumulativeUsd,
      usd: d.usd,
    };
  });

  const currentMonthEntry = monthly.find(m => m.month === nowStr) ?? monthly[monthly.length - 1];

  const totalDeposited = monthly.reduce((s, m) => s + m.deposited, 0);
  const totalWithdrawn = monthly.reduce((s, m) => s + m.withdrawn, 0);
  const totalSavings = totalDeposited - totalWithdrawn + initialBalance;
  const totalUsd = cumulativeUsd;

  const avgMonthlySavings = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.net, 0) / monthly.length
    : 0;

  const rateMonths = monthly.filter(m => m.income > 0);
  const avgSavingsRate = rateMonths.length > 0
    ? (rateMonths.reduce((acc, m) => acc + m.net / m.income, 0) / rateMonths.length) * 100
    : 0;

  const savingMonths = monthly.filter(m => m.net > 0);
  const bestMonth = savingMonths.length > 0
    ? savingMonths.reduce((best, m) => m.net > best.net ? m : best, savingMonths[0])
    : null;

  // Racha: contar hacia atrás, saltar mes actual si todavía no tiene movimientos
  let streakStartIdx = monthly.length - 1;
  if (monthly[streakStartIdx].month === nowStr && monthly[streakStartIdx].net === 0) {
    streakStartIdx--;
  }
  let streakMonths = 0;
  for (let i = streakStartIdx; i >= 0; i--) {
    if (monthly[i].net > 0) streakMonths++;
    else break;
  }

  // Movimientos ordenados por fecha DESC
  movements.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

  return {
    monthly,
    currentMonthData: currentMonthEntry,
    totalSavings,
    totalDeposited,
    totalWithdrawn,
    totalUsd,
    avgMonthlySavings,
    avgSavingsRate,
    bestMonth,
    streakMonths,
    savingsCategories,
    movements,
    initialBalance,
    initialBalanceMeta,
  };
}

const INITIAL_BALANCE_KEY = 'ahorros_initial_balance';

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
      const [all, savedBalance] = await Promise.all([
        getAllTransactions(),
        getSetting(INITIAL_BALANCE_KEY),
      ]);
      let initialBalance = 0;
      let initialBalanceMeta: InitialBalanceMeta | null = null;
      if (savedBalance) {
        try {
          const parsed = JSON.parse(savedBalance) as InitialBalanceMeta;
          initialBalanceMeta = parsed;
          initialBalance = parsed.ars;
        } catch {
          // formato antiguo: número plano
          initialBalance = parseFloat(savedBalance) || 0;
        }
      }
      setData(computeAhorros(all, savingsCategories, initialBalance, initialBalanceMeta));
    } catch (e) {
      await logError('useAhorros', e);
      setError(e instanceof Error ? e.message : 'Error al cargar ahorros');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savingsCategories.join(',')]);

  const saveInitialBalance = useCallback(async (meta: InitialBalanceMeta) => {
    await setSetting(INITIAL_BALANCE_KEY, JSON.stringify(meta));
    await fetch();
  }, [fetch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch, saveInitialBalance };
}

