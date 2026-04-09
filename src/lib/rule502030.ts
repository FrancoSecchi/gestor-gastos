import { Transaction, Rule502030Data, Rule502030Group } from '../types';
import { Rule502030Mapping, getDefaultRule502030Mapping } from './rule502030Mapping';

/**
 * Usa el mapeo configurado por el usuario (qué categoría de gasto cae en Necesidades / Deseos / Ahorro).
 * El gasto cuyo nombre de categoría no aparece en ningún grupo se suma a Deseos (p. ej. datos viejos).
 */
export function calculateRule502030(
  transactions: Transaction[],
  totalIncome: number,
  mapping: Rule502030Mapping = getDefaultRule502030Mapping()
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

  const groups: { group: Rule502030Group; percentage: number; color: string }[] = [
    { group: 'Necesidades', percentage: 50, color: '#3b82f6' },
    { group: 'Deseos', percentage: 30, color: '#a855f7' },
    { group: 'Ahorro/Inversión', percentage: 20, color: '#22c55e' },
  ];

  return groups.map(({ group, percentage, color }) => {
    const categories = mapping[group];
    let spent = categories.reduce((sum, cat) => sum + (expensesByCategory[cat] ?? 0), 0);
    if (group === 'Deseos') {
      spent += orphanSpent;
    }
    const budget = totalIncome * (percentage / 100);
    return { group, budget, spent, percentage, categories, color };
  });
}
