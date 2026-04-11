import { Transaction, Rule502030Data, Rule502030Group, Rule502030Percentages } from '../types';
import { Rule502030Mapping, getDefaultRule502030Mapping } from './rule502030Mapping';

export const DEFAULT_PERCENTAGES: Rule502030Percentages = {
  Necesidades: 50,
  Deseos: 30,
  'Ahorro/Inversión': 20,
};

const GROUP_COLORS: Record<Rule502030Group, string> = {
  'Necesidades': '#3b82f6',
  'Deseos': '#a855f7',
  'Ahorro/Inversión': '#22c55e',
};

/**
 * Usa el mapeo configurado por el usuario (qué categoría de gasto cae en Necesidades / Deseos / Ahorro).
 * El gasto cuyo nombre de categoría no aparece en ningún grupo se suma a Deseos (p. ej. datos viejos).
 */
export function calculateRule502030(
  transactions: Transaction[],
  totalIncome: number,
  mapping: Rule502030Mapping = getDefaultRule502030Mapping(),
  percentages: Rule502030Percentages = DEFAULT_PERCENTAGES
): Rule502030Data[] {
  const expensesByCategory: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] ?? 0) + t.amount;
    });

  const tracked = new Set(Object.values(mapping).flat());

  let orphanSpent = 0;
  for (const [cat, amt] of Object.entries(expensesByCategory)) {
    if (!tracked.has(cat)) {
      orphanSpent += amt;
    }
  }

  const groups: Rule502030Group[] = ['Necesidades', 'Deseos', 'Ahorro/Inversión'];

  return groups.map(group => {
    const percentage = percentages[group];
    const color = GROUP_COLORS[group];
    const categories = mapping[group];
    let spent = categories.reduce((sum, cat) => sum + (expensesByCategory[cat] ?? 0), 0);
    if (group === 'Deseos') {
      spent += orphanSpent;
    }
    const budget = totalIncome * (percentage / 100);
    return { group, budget, spent, percentage, categories, color };
  });
}
