import Database from '@tauri-apps/plugin-sql';
import { Transaction, NewTransaction, Summary, CategorySummary, RecurringPayment, NewRecurringPayment, Debt, NewDebt, DebtPayment, NewDebtPayment } from '../types';
import { isPresentationMode } from './presentationMode';
import { filterMockTransactions, computeMockSummary, MOCK_RECURRING_PAYMENTS, MOCK_SAVINGS_GOALS, MOCK_DEBTS, MOCK_TRANSACTIONS } from './mockData';

let db: Database | null = null;

export interface ErrorLogEntry {
  id: number;
  context: string;
  message: string;
  details?: string | null;
  created_at: string;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:gastos.db');
    await initializeDb(db);
  }
  return db;
}

async function initializeDb(database: Database): Promise<void> {
  // Create tables
  await database.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount REAL NOT NULL,
      amount_usd REAL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS recurring_payments (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT,
      frequency TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  // Migrations
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN dollar_type TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN subtype TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN receipt_path TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN recurring_id TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN goal_id TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN debt_id TEXT`);
  } catch {
    // Column already exists
  }

  // Indexes
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON transactions(recurring_id)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_recurring_is_active ON recurring_payments(is_active)`);

  // Investment tables
  await database.execute(`
    CREATE TABLE IF NOT EXISTS investment_assets (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS investment_movements (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
      quantity REAL NOT NULL,
      price_usd REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_inv_movements_ticker ON investment_movements(ticker)`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_inv_movements_date ON investment_movements(date)`);

  // Debts tables
  await database.execute(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      direction TEXT NOT NULL CHECK(direction IN ('i_owe', 'they_owe')),
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      transaction_id TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id)`);

  // Seed default investment assets if empty
  const assetCount = await database.select<{ n: number }[]>('SELECT COUNT(*) as n FROM investment_assets');
  if ((assetCount[0]?.n ?? 0) === 0) {
    const now = new Date().toISOString();
    const defaultAssets: [string, string][] = [
      ['SPY', 'S&P 500 ETF'],
      ['QQQ', 'Nasdaq 100 ETF'],
      ['AAPL', 'Apple'],
      ['GOOGL', 'Alphabet (Google)'],
      ['MSFT', 'Microsoft'],
      ['AMZN', 'Amazon'],
      ['MELI', 'MercadoLibre'],
      ['TSLA', 'Tesla'],
      ['NVDA', 'NVIDIA'],
    ];
    for (const [ticker, name] of defaultAssets) {
      await database.execute(
        'INSERT OR IGNORE INTO investment_assets (ticker, name, created_at) VALUES ($1, $2, $3)',
        [ticker, name, now]
      );
    }
  }

  // Check if initialized
  const result = await database.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'initialized'"
  );

  if (result.length === 0 || result[0].value !== 'true') {
    await database.execute(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('initialized', 'true')"
    );
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Error desconocido';
  }
}

function errorToDetails(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export async function logError(context: string, error: unknown): Promise<void> {
  try {
    const database = await getDb();
    await database.execute(
      `INSERT INTO error_logs (context, message, details, created_at) VALUES ($1, $2, $3, $4)`,
      [context, errorToMessage(error), errorToDetails(error), new Date().toISOString()]
    );
  } catch (logErrorFailure) {
    console.error('No se pudo guardar el error en la DB:', logErrorFailure);
  }
}

export function getReadableError(error: unknown): string {
  return errorToMessage(error);
}

export async function getErrorLogs(limit = 300): Promise<ErrorLogEntry[]> {
  const database = await getDb();
  const parsedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 300;
  return database.select<ErrorLogEntry[]>(
    `SELECT id, context, message, details, created_at
     FROM error_logs
     ORDER BY id DESC
     LIMIT $1`,
    [parsedLimit]
  );
}

export async function getTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
  if (isPresentationMode()) return filterMockTransactions(startDate, endDate);
  const database = await getDb();
  const result = await database.select<Transaction[]>(
    `SELECT * FROM transactions WHERE date >= $1 AND date <= $2 ORDER BY date DESC, created_at DESC`,
    [startDate, endDate]
  );
  return result;
}

export async function getAllTransactions(): Promise<Transaction[]> {
  if (isPresentationMode()) return MOCK_TRANSACTIONS;
  const database = await getDb();
  const result = await database.select<Transaction[]>(
    `SELECT * FROM transactions ORDER BY date DESC, created_at DESC`
  );
  return result;
}

export async function createTransaction(tx: NewTransaction): Promise<Transaction> {
  const database = await getDb();
  const id = generateId();
  const created_at = new Date().toISOString();

  await database.execute(
    `INSERT INTO transactions (id, type, subtype, amount, amount_usd, dollar_type, category, subcategory, description, receipt_path, date, created_at, recurring_id, goal_id, debt_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [id, tx.type, tx.subtype ?? null, tx.amount, tx.amount_usd ?? null, tx.dollar_type ?? null, tx.category, tx.subcategory ?? null, tx.description ?? null, tx.receipt_path ?? null, tx.date, created_at, tx.recurring_id ?? null, tx.goal_id ?? null, tx.debt_id ?? null]
  );

  return { ...tx, id, created_at };
}

export async function updateTransaction(tx: Transaction): Promise<Transaction> {
  const database = await getDb();
  await database.execute(
    `UPDATE transactions SET type=$1, subtype=$2, amount=$3, amount_usd=$4, dollar_type=$5, category=$6, subcategory=$7, description=$8, receipt_path=$9, date=$10, recurring_id=$11, goal_id=$12, debt_id=$13
     WHERE id=$14`,
    [tx.type, tx.subtype ?? null, tx.amount, tx.amount_usd ?? null, tx.dollar_type ?? null, tx.category, tx.subcategory ?? null, tx.description ?? null, tx.receipt_path ?? null, tx.date, tx.recurring_id ?? null, tx.goal_id ?? null, tx.debt_id ?? null, tx.id]
  );
  return tx;
}

// --- Recurring Payments ---

export async function createRecurringPayment(rp: NewRecurringPayment): Promise<RecurringPayment> {
  const database = await getDb();
  const id = generateId();
  const created_at = new Date().toISOString();

  await database.execute(
    `INSERT INTO recurring_payments (id, type, amount, category, subcategory, description, frequency, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)`,
    [id, rp.type, rp.amount, rp.category, rp.subcategory ?? null, rp.description ?? null, rp.frequency, created_at]
  );

  return { ...rp, id, is_active: 1, created_at };
}

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  if (isPresentationMode()) return MOCK_RECURRING_PAYMENTS;
  const database = await getDb();
  return database.select<RecurringPayment[]>(
    `SELECT * FROM recurring_payments ORDER BY created_at DESC`
  );
}

export async function updateRecurringPayment(rp: RecurringPayment): Promise<RecurringPayment> {
  const database = await getDb();
  await database.execute(
    `UPDATE recurring_payments SET type=$1, amount=$2, category=$3, subcategory=$4, description=$5, frequency=$6, is_active=$7
     WHERE id=$8`,
    [rp.type, rp.amount, rp.category, rp.subcategory ?? null, rp.description ?? null, rp.frequency, rp.is_active, rp.id]
  );
  return rp;
}

export async function deleteRecurringPayment(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(`DELETE FROM recurring_payments WHERE id=$1`, [id]);
  // Unlink any transactions
  await database.execute(`UPDATE transactions SET recurring_id=NULL WHERE recurring_id=$1`, [id]);
}

export async function getTransactionsByRecurringId(recurringId: string): Promise<Transaction[]> {
  const database = await getDb();
  return database.select<Transaction[]>(
    `SELECT * FROM transactions WHERE recurring_id=$1 ORDER BY date DESC`,
    [recurringId]
  );
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const database = await getDb();
  await database.execute(`DELETE FROM transactions WHERE id=$1`, [id]);
  return true;
}

export async function renameTransactionCategory(oldName: string, newName: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE transactions SET category = $1 WHERE category = $2`,
    [newName, oldName]
  );
}

export async function clearAllData(): Promise<void> {
  const database = await getDb();
  try {
    await database.execute('DELETE FROM transactions');
    await database.execute('DELETE FROM settings');
  } catch (error) {
    await logError('clearAllData', error);
    throw error;
  }
}

export async function getSummary(startDate: string, endDate: string): Promise<Summary> {
  if (isPresentationMode()) return computeMockSummary(startDate, endDate);
  const database = await getDb();

  const [incomeResult, expenseResult, categoryResult] = await Promise.all([
    database.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type='income' AND (subtype IS NULL OR subtype != 'transfer_from_savings')
       AND date >= $1 AND date <= $2`,
      [startDate, endDate]
    ),
    database.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='expense' AND date >= $1 AND date <= $2`,
      [startDate, endDate]
    ),
    database.select<CategorySummary[]>(
      `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM transactions WHERE type='expense' AND date >= $1 AND date <= $2
       GROUP BY category ORDER BY total DESC`,
      [startDate, endDate]
    ),
  ]);

  const total_income = incomeResult[0]?.total ?? 0;
  const total_expenses = expenseResult[0]?.total ?? 0;

  return {
    total_income,
    total_expenses,
    balance: total_income - total_expenses,
    by_category: categoryResult,
  };
}

export async function getRule502030Enabled(): Promise<boolean> {
  const raw = await getSetting('rule502030_enabled');
  if (raw === null) return true;
  return raw === 'true';
}

export async function setRule502030Enabled(enabled: boolean): Promise<boolean> {
  return setSetting('rule502030_enabled', enabled ? 'true' : 'false');
}

export async function getSavingsGoals(): Promise<string | null> {
  if (isPresentationMode()) return JSON.stringify(MOCK_SAVINGS_GOALS);
  return getSetting('savings_goals');
}

export async function saveSavingsGoals(value: string): Promise<boolean> {
  return setSetting('savings_goals', value);
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const result = await database.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key=$1`,
    [key]
  );
  return result.length > 0 ? result[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<boolean> {
  const database = await getDb();
  await database.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`,
    [key, value]
  );
  return true;
}

// --- Debts ---

export async function getDebts(): Promise<Debt[]> {
  if (isPresentationMode()) return MOCK_DEBTS;
  const database = await getDb();
  return database.select<Debt[]>(`SELECT * FROM debts ORDER BY created_at DESC`);
}

export async function createDebt(debt: NewDebt): Promise<Debt> {
  const database = await getDb();
  const id = generateId();
  const created_at = new Date().toISOString();
  await database.execute(
    `INSERT INTO debts (id, name, description, amount, currency, direction, due_date, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
    [id, debt.name, debt.description ?? null, debt.amount, debt.currency, debt.direction, debt.due_date ?? null, created_at]
  );
  return { ...debt, id, status: 'active', created_at };
}

export async function updateDebt(debt: Debt): Promise<Debt> {
  const database = await getDb();
  await database.execute(
    `UPDATE debts SET name=$1, description=$2, amount=$3, currency=$4, direction=$5, due_date=$6, status=$7 WHERE id=$8`,
    [debt.name, debt.description ?? null, debt.amount, debt.currency, debt.direction, debt.due_date ?? null, debt.status, debt.id]
  );
  return debt;
}

export async function deleteDebt(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(`DELETE FROM debt_payments WHERE debt_id=$1`, [id]);
  await database.execute(`DELETE FROM debts WHERE id=$1`, [id]);
}

export async function getDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const database = await getDb();
  return database.select<DebtPayment[]>(
    `SELECT * FROM debt_payments WHERE debt_id=$1 ORDER BY date DESC, created_at DESC`,
    [debtId]
  );
}

export async function createDebtPayment(payment: NewDebtPayment): Promise<DebtPayment> {
  const database = await getDb();
  const id = generateId();
  const created_at = new Date().toISOString();
  await database.execute(
    `INSERT INTO debt_payments (id, debt_id, transaction_id, amount, date, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, payment.debt_id, payment.transaction_id ?? null, payment.amount, payment.date, payment.notes ?? null, created_at]
  );
  return { ...payment, id, created_at };
}

export async function deleteDebtPayment(id: string): Promise<void> {
  const database = await getDb();
  await database.execute(`DELETE FROM debt_payments WHERE id=$1`, [id]);
}

export async function getDebtPaymentByTransactionId(transactionId: string): Promise<DebtPayment | null> {
  const database = await getDb();
  const rows = await database.select<DebtPayment[]>(
    `SELECT * FROM debt_payments WHERE transaction_id=$1 LIMIT 1`,
    [transactionId]
  );
  return rows[0] ?? null;
}

export async function deleteDebtPaymentByTransactionId(transactionId: string): Promise<void> {
  const database = await getDb();
  await database.execute(`DELETE FROM debt_payments WHERE transaction_id=$1`, [transactionId]);
}

const ALLOWED_TABLES = ['transactions', 'settings', 'error_logs', 'recurring_payments'] as const;
export type DbTable = typeof ALLOWED_TABLES[number];

export async function getTableRows(
  table: DbTable,
  limit: number,
  offset: number
): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return database.select<Record<string, unknown>[]>(
    `SELECT * FROM ${table} ORDER BY rowid DESC LIMIT ${limit} OFFSET ${offset}`
  );
}

export async function getTableCount(table: DbTable): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ n: number }[]>(
    `SELECT COUNT(*) as n FROM ${table}`
  );
  return result[0]?.n ?? 0;
}
