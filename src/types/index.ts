export type TransactionType = 'expense' | 'income';
export type TransactionSubtype = 'transfer_to_savings' | 'transfer_from_savings';
export type RecurrenceFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export interface RecurringPayment {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  frequency: RecurrenceFrequency;
  is_active: number;
  created_at: string;
}

export interface NewRecurringPayment {
  type: TransactionType;
  amount: number;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  frequency: RecurrenceFrequency;
}

export type ExpenseCategory =
  | 'Vivienda'
  | 'Comida'
  | 'Transporte'
  | 'Salud'
  | 'Entretenimiento'
  | 'Ropa'
  | 'Salidas'
  | 'Ahorro'
  | 'Inversión'
  | 'Otros gastos';

export type IncomeCategory =
  | 'Salario'
  | 'Freelance'
  | 'Inversiones'
  | 'Otros ingresos'
  | 'Retiro de ahorro';

export type Category = ExpenseCategory | IncomeCategory;

export type Rule502030Group = 'Necesidades' | 'Deseos' | 'Ahorro/Inversión';

export interface Rule502030Percentages {
  Necesidades: number;
  Deseos: number;
  'Ahorro/Inversión': number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currency: 'ARS' | 'USD';
  targetDate: string; // yyyy-MM-dd
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  subtype?: TransactionSubtype | null;
  amount: number;
  amount_usd?: number | null;
  dollar_type?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  receipt_path?: string | null;
  date: string;
  created_at: string;
  recurring_id?: string | null;
  goal_id?: string | null;
}

export interface NewTransaction {
  type: TransactionType;
  subtype?: TransactionSubtype | null;
  amount: number;
  amount_usd?: number | null;
  dollar_type?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  receipt_path?: string | null;
  date: string;
  recurring_id?: string | null;
  goal_id?: string | null;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
}

export interface Summary {
  total_income: number;
  total_expenses: number;
  balance: number;
  by_category: CategorySummary[];
}

export interface DollarRate {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface DollarCache {
  rates: DollarRate[];
  timestamp: number;
}

export type DateFilter =
  | 'current_week'
  | 'current_month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'next_month'
  | 'next_quarter'
  | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

export type QuickFilter = 'recurring' | 'savings_transfer' | 'has_receipt';

export interface FilterState {
  dateFilter: DateFilter;
  customRange: DateRange;
  type: 'all' | 'expense' | 'income';
  category: string;
  quickFilters: QuickFilter[];
}

export interface Rule502030Data {
  group: Rule502030Group;
  budget: number;
  spent: number;
  percentage: number;
  categories: string[];
  color: string;
}

export const EXPENSE_CATEGORIES: Record<Rule502030Group, ExpenseCategory[]> = {
  'Necesidades': ['Vivienda', 'Comida', 'Transporte', 'Salud'],
  'Deseos': ['Entretenimiento', 'Ropa', 'Salidas', 'Otros gastos'],
  'Ahorro/Inversión': ['Ahorro', 'Inversión'],
};

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Vivienda', 'Comida', 'Transporte', 'Salud',
  'Entretenimiento', 'Ropa', 'Salidas',
  'Ahorro', 'Inversión', 'Otros gastos',
];

export const ALL_INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario', 'Freelance', 'Inversiones', 'Otros ingresos',
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Vivienda': '#3b82f6',
  'Comida': '#22c55e',
  'Transporte': '#06b6d4',
  'Salud': '#ec4899',
  'Entretenimiento': '#a855f7',
  'Ropa': '#f97316',
  'Salidas': '#eab308',
  'Ahorro': '#10b981',
  'Inversión': '#0ea5e9',
  'Otros gastos': '#6b7280',
  'Salario': '#22c55e',
  'Freelance': '#3b82f6',
  'Inversiones': '#0ea5e9',
  'Otros ingresos': '#94a3b8',
  'Retiro de ahorro': '#f59e0b',
};

/** Une categorías base con personalizadas, sin duplicar (comparación case-insensitive). */
export function mergeCategoryLists(base: readonly string[], custom: string[]): string[] {
  const seen = new Set(base.map(b => b.toLowerCase()));
  const out = [...base];
  for (const c of custom) {
    const t = c.trim();
    if (!t) continue;
    const low = t.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(t);
  }
  return out;
}

/** Color estable para cualquier nombre de categoría (incluye personalizadas). */
export function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 42%, 52%)`;
}
