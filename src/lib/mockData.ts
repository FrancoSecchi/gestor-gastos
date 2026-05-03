import { Transaction, Summary, CategorySummary, RecurringPayment, SavingsGoal, Debt } from '../types';

// ─── Transactions ────────────────────────────────────────────────────────────

export const MOCK_TRANSACTIONS: Transaction[] = [
  // ── Marzo 2026 ──────────────────────────────────────────────────────────────
  { id: 'mock-tx-1',  type: 'income',  subtype: null, amount: 650000, amount_usd: null, dollar_type: null, category: 'Salario',        subcategory: null, description: 'Sueldo marzo',        receipt_path: null, date: '2026-03-01', created_at: '2026-03-01T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-2',  type: 'expense', subtype: null, amount: 180000, amount_usd: null, dollar_type: null, category: 'Vivienda',       subcategory: null, description: 'Alquiler',             receipt_path: null, date: '2026-03-02', created_at: '2026-03-02T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-3',  type: 'expense', subtype: null, amount:  42500, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-03-05', created_at: '2026-03-05T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-4',  type: 'expense', subtype: null, amount:  12000, amount_usd: null, dollar_type: null, category: 'Transporte',     subcategory: null, description: 'Nafta',                receipt_path: null, date: '2026-03-07', created_at: '2026-03-07T08:30:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-5',  type: 'expense', subtype: null, amount:  28000, amount_usd: null, dollar_type: null, category: 'Salidas',        subcategory: null, description: 'Restaurant',            receipt_path: null, date: '2026-03-09', created_at: '2026-03-09T21:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-6',  type: 'expense', subtype: null, amount:  38000, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-03-12', created_at: '2026-03-12T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-7',  type: 'expense', subtype: null, amount:   6500, amount_usd: null, dollar_type: null, category: 'Entretenimiento', subcategory: null, description: 'Netflix',              receipt_path: null, date: '2026-03-13', created_at: '2026-03-13T00:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-8',  type: 'expense', subtype: null, amount:   3500, amount_usd: null, dollar_type: null, category: 'Entretenimiento', subcategory: null, description: 'Spotify',             receipt_path: null, date: '2026-03-13', created_at: '2026-03-13T00:01:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-9',  type: 'income',  subtype: null, amount: 150000, amount_usd: null, dollar_type: null, category: 'Freelance',      subcategory: null, description: 'Proyecto web',         receipt_path: null, date: '2026-03-15', created_at: '2026-03-15T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-10', type: 'expense', subtype: null, amount:  15200, amount_usd: null, dollar_type: null, category: 'Otros gastos',   subcategory: null, description: 'Electricidad',         receipt_path: null, date: '2026-03-17', created_at: '2026-03-17T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-11', type: 'expense', subtype: null, amount:  35000, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-03-18', created_at: '2026-03-18T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-12', type: 'expense', subtype: null, amount:   8500, amount_usd: null, dollar_type: null, category: 'Transporte',     subcategory: null, description: 'SUBE',                 receipt_path: null, date: '2026-03-20', created_at: '2026-03-20T08:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-13', type: 'expense', subtype: null, amount:  11800, amount_usd: null, dollar_type: null, category: 'Otros gastos',   subcategory: null, description: 'Gas',                  receipt_path: null, date: '2026-03-22', created_at: '2026-03-22T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-14', type: 'expense', subtype: null, amount:  44000, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-03-24', created_at: '2026-03-24T11:30:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-15', type: 'expense', subtype: null, amount:  19500, amount_usd: null, dollar_type: null, category: 'Salidas',        subcategory: null, description: 'Bar con amigos',       receipt_path: null, date: '2026-03-26', created_at: '2026-03-26T22:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-16', type: 'expense', subtype: 'transfer_to_savings', amount: 80000, amount_usd: null, dollar_type: null, category: 'Ahorro', subcategory: null, description: 'Ahorro mensual', receipt_path: null, date: '2026-03-28', created_at: '2026-03-28T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-17', type: 'expense', subtype: null, amount:  45000, amount_usd: null, dollar_type: null, category: 'Ropa',           subcategory: null, description: 'Ropa de temporada',    receipt_path: null, date: '2026-03-30', created_at: '2026-03-30T16:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },

  // ── Abril 2026 ───────────────────────────────────────────────────────────────
  { id: 'mock-tx-18', type: 'income',  subtype: null, amount: 650000, amount_usd: null, dollar_type: null, category: 'Salario',        subcategory: null, description: 'Sueldo abril',         receipt_path: null, date: '2026-04-01', created_at: '2026-04-01T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-19', type: 'expense', subtype: null, amount: 180000, amount_usd: null, dollar_type: null, category: 'Vivienda',       subcategory: null, description: 'Alquiler',             receipt_path: null, date: '2026-04-02', created_at: '2026-04-02T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-20', type: 'expense', subtype: null, amount:  46000, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-04-04', created_at: '2026-04-04T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-21', type: 'expense', subtype: null, amount:  14000, amount_usd: null, dollar_type: null, category: 'Transporte',     subcategory: null, description: 'Nafta',                receipt_path: null, date: '2026-04-06', created_at: '2026-04-06T08:30:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-22', type: 'expense', subtype: null, amount:  32000, amount_usd: null, dollar_type: null, category: 'Salidas',        subcategory: null, description: 'Restaurant',            receipt_path: null, date: '2026-04-08', created_at: '2026-04-08T21:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-23', type: 'expense', subtype: null, amount:  39500, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-04-10', created_at: '2026-04-10T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-24', type: 'expense', subtype: null, amount:   6500, amount_usd: null, dollar_type: null, category: 'Entretenimiento', subcategory: null, description: 'Netflix',             receipt_path: null, date: '2026-04-12', created_at: '2026-04-12T00:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-25', type: 'expense', subtype: null, amount:   3500, amount_usd: null, dollar_type: null, category: 'Entretenimiento', subcategory: null, description: 'Spotify',             receipt_path: null, date: '2026-04-12', created_at: '2026-04-12T00:01:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-26', type: 'income',  subtype: null, amount: 180000, amount_usd: null, dollar_type: null, category: 'Freelance',      subcategory: null, description: 'Consultoría',          receipt_path: null, date: '2026-04-15', created_at: '2026-04-15T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-27', type: 'expense', subtype: null, amount:  17300, amount_usd: null, dollar_type: null, category: 'Otros gastos',   subcategory: null, description: 'Electricidad',         receipt_path: null, date: '2026-04-16', created_at: '2026-04-16T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-28', type: 'expense', subtype: null, amount:  41000, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-04-18', created_at: '2026-04-18T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-29', type: 'expense', subtype: null, amount:   9000, amount_usd: null, dollar_type: null, category: 'Transporte',     subcategory: null, description: 'SUBE',                 receipt_path: null, date: '2026-04-20', created_at: '2026-04-20T08:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-30', type: 'expense', subtype: null, amount:  13400, amount_usd: null, dollar_type: null, category: 'Otros gastos',   subcategory: null, description: 'Gas',                  receipt_path: null, date: '2026-04-22', created_at: '2026-04-22T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-31', type: 'expense', subtype: null, amount:  37500, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-04-24', created_at: '2026-04-24T11:30:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-32', type: 'expense', subtype: null, amount:  24000, amount_usd: null, dollar_type: null, category: 'Salidas',        subcategory: null, description: 'Bar con amigos',       receipt_path: null, date: '2026-04-26', created_at: '2026-04-26T22:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-33', type: 'expense', subtype: 'transfer_to_savings', amount: 90000, amount_usd: null, dollar_type: null, category: 'Ahorro', subcategory: null, description: 'Ahorro mensual', receipt_path: null, date: '2026-04-28', created_at: '2026-04-28T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-34', type: 'expense', subtype: null, amount:  22000, amount_usd: null, dollar_type: null, category: 'Entretenimiento', subcategory: null, description: 'Cine y teatro',       receipt_path: null, date: '2026-04-29', created_at: '2026-04-29T20:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },

  // ── Mayo 2026 ────────────────────────────────────────────────────────────────
  { id: 'mock-tx-35', type: 'income',  subtype: null, amount: 650000, amount_usd: null, dollar_type: null, category: 'Salario',        subcategory: null, description: 'Sueldo mayo',          receipt_path: null, date: '2026-05-01', created_at: '2026-05-01T09:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-36', type: 'expense', subtype: null, amount: 185000, amount_usd: null, dollar_type: null, category: 'Vivienda',       subcategory: null, description: 'Alquiler',             receipt_path: null, date: '2026-05-01', created_at: '2026-05-01T10:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-37', type: 'expense', subtype: null, amount:  43500, amount_usd: null, dollar_type: null, category: 'Comida',         subcategory: null, description: 'Supermercado',         receipt_path: null, date: '2026-05-02', created_at: '2026-05-02T11:00:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
  { id: 'mock-tx-38', type: 'expense', subtype: null, amount:   7500, amount_usd: null, dollar_type: null, category: 'Transporte',     subcategory: null, description: 'Nafta',                receipt_path: null, date: '2026-05-02', created_at: '2026-05-02T08:30:00.000Z', recurring_id: null, goal_id: null, debt_id: null },
];

// ─── Recurring Payments ───────────────────────────────────────────────────────

export const MOCK_RECURRING_PAYMENTS: RecurringPayment[] = [
  { id: 'mock-rec-1', type: 'expense', amount: 185000, category: 'Vivienda',        subcategory: null, description: 'Alquiler',  frequency: 'monthly', is_active: 1, created_at: '2026-03-01T00:00:00.000Z' },
  { id: 'mock-rec-2', type: 'expense', amount:   6500, category: 'Entretenimiento', subcategory: null, description: 'Netflix',   frequency: 'monthly', is_active: 1, created_at: '2026-03-01T00:00:00.000Z' },
  { id: 'mock-rec-3', type: 'expense', amount:  18000, category: 'Salud',           subcategory: null, description: 'Gimnasio',  frequency: 'monthly', is_active: 1, created_at: '2026-03-01T00:00:00.000Z' },
];

// ─── Savings Goals ────────────────────────────────────────────────────────────

export const MOCK_SAVINGS_GOALS: SavingsGoal[] = [
  { id: 'mock-goal-1', name: 'Viaje a Europa',        targetAmount: 1500000, currency: 'ARS', targetDate: '2026-12-01', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'mock-goal-2', name: 'Fondo de emergencia',   targetAmount: 2400000, currency: 'ARS', targetDate: '2027-06-01', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
];

// ─── Debts ────────────────────────────────────────────────────────────────────

export const MOCK_DEBTS: Debt[] = [
  { id: 'mock-debt-1', name: 'Préstamo a Juan', description: 'Le presté para el auto', amount: 50000, currency: 'ARS', direction: 'they_owe', due_date: '2026-07-01', status: 'active', created_at: '2026-02-01T00:00:00.000Z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function filterMockTransactions(startDate: string, endDate: string): Transaction[] {
  return MOCK_TRANSACTIONS.filter(tx => tx.date >= startDate && tx.date <= endDate);
}

export function computeMockSummary(startDate: string, endDate: string): Summary {
  const txs = filterMockTransactions(startDate, endDate);
  const total_income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const total_expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = total_income - total_expenses;

  const map = new Map<string, { total: number; count: number }>();
  for (const tx of txs.filter(t => t.type === 'expense')) {
    const prev = map.get(tx.category) ?? { total: 0, count: 0 };
    map.set(tx.category, { total: prev.total + tx.amount, count: prev.count + 1 });
  }
  const by_category: CategorySummary[] = Array.from(map.entries())
    .map(([category, data]) => ({ category, total: data.total, count: data.count }))
    .sort((a, b) => b.total - a.total);

  return { total_income, total_expenses, balance, by_category };
}
