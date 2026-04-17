import { Transaction, Summary, Rule502030Data } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function exportToExcel(
  transactions: Transaction[],
  summary: Summary,
  startDate: string,
  endDate: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transactions
  const txData = [
    ['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Descripción', 'Monto (ARS)', 'Monto (USD)'],
    ...transactions.map(tx => [
      tx.date,
      tx.type === 'expense' ? 'Gasto' : 'Ingreso',
      tx.category,
      tx.subcategory ?? '',
      tx.description ?? '',
      tx.amount,
      tx.amount_usd ?? '',
    ])
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(txData);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Transacciones');

  // Sheet 2: Summary
  const summaryData = [
    ['RESUMEN DEL PERÍODO'],
    ['Período', `${startDate} al ${endDate}`],
    [''],
    ['Total Ingresos', summary.total_income],
    ['Total Gastos', summary.total_expenses],
    ['Balance', summary.balance],
    [''],
    ['GASTOS POR CATEGORÍA'],
    ['Categoría', 'Total (ARS)', 'Cantidad'],
    ...summary.by_category.map(cat => [cat.category, cat.total, cat.count])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

  // Download
  const fileName = `gastos_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportForClaude(
  transactions: Transaction[],
  summary: Summary,
  rule502030: Rule502030Data[],
  startDate: string,
  endDate: string
): string {
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  const lines: string[] = [
    `# Análisis Financiero Personal`,
    `**Período:** ${startDate} al ${endDate}`,
    `**Generado:** ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    '',
    `## Resumen General`,
    `- **Total Ingresos:** $${formatARS(summary.total_income)}`,
    `- **Total Gastos:** $${formatARS(summary.total_expenses)}`,
    `- **Balance:** $${formatARS(summary.balance)}`,
    `- **Tasa de ahorro:** ${summary.total_income > 0 ? ((summary.balance / summary.total_income) * 100).toFixed(1) : 0}%`,
    '',
    `## Ingresos (${income.length} registros)`,
  ];

  const incomeByCategory = groupByCategory(income);
  for (const [cat, total] of Object.entries(incomeByCategory)) {
    lines.push(`- **${cat}:** $${formatARS(total)}`);
  }

  lines.push('', `## Gastos por Categoría (${expenses.length} registros)`);
  for (const cat of summary.by_category) {
    const pct = summary.total_expenses > 0 ? ((cat.total / summary.total_expenses) * 100).toFixed(1) : '0';
    lines.push(`- **${cat.category}:** $${formatARS(cat.total)} (${pct}% del total, ${cat.count} transacciones)`);
  }

  lines.push('', `## Regla 50/30/20`);
  for (const group of rule502030) {
    const status = group.spent > group.budget ? '⚠️ EXCEDIDO' : '✅ Dentro del límite';
    const diff = Math.abs(group.budget - group.spent);
    const diffText = group.spent > group.budget
      ? `$${formatARS(diff)} sobre el límite`
      : `$${formatARS(diff)} disponibles`;
    lines.push(`### ${group.group} (${group.percentage}% = $${formatARS(group.budget)})`);
    lines.push(`- Gastado: $${formatARS(group.spent)} | ${status}`);
    lines.push(`- ${diffText}`);
    lines.push(`- Categorías: ${group.categories.join(', ')}`);
  }

  lines.push('', `## Detalle de Transacciones`);
  lines.push('| Fecha | Tipo | Categoría | Descripción | Monto ARS |');
  lines.push('|-------|------|-----------|-------------|-----------|');
  for (const tx of transactions.slice(0, 50)) {
    const tipo = tx.type === 'expense' ? 'Gasto' : 'Ingreso';
    const desc = tx.description ?? '-';
    lines.push(`| ${tx.date} | ${tipo} | ${tx.category} | ${desc} | $${formatARS(tx.amount)} |`);
  }
  if (transactions.length > 50) {
    lines.push(`*(Se muestran 50 de ${transactions.length} transacciones)*`);
  }

  return lines.join('\n');
}

function groupByCategory(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);
}

export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
