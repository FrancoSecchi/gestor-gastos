import Database from '@tauri-apps/plugin-sql';
import { Transaction, NewTransaction, Summary, CategorySummary } from '../types';

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

  // Migrations
  try {
    await database.execute(`ALTER TABLE transactions ADD COLUMN dollar_type TEXT`);
  } catch {
    // Column already exists
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
  const database = await getDb();
  const result = await database.select<Transaction[]>(
    `SELECT * FROM transactions WHERE date >= $1 AND date <= $2 ORDER BY date DESC, created_at DESC`,
    [startDate, endDate]
  );
  return result;
}

export async function getAllTransactions(): Promise<Transaction[]> {
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
    `INSERT INTO transactions (id, type, amount, amount_usd, dollar_type, category, subcategory, description, date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, tx.type, tx.amount, tx.amount_usd ?? null, tx.dollar_type ?? null, tx.category, tx.subcategory ?? null, tx.description ?? null, tx.date, created_at]
  );

  return { ...tx, id, created_at };
}

export async function updateTransaction(tx: Transaction): Promise<Transaction> {
  const database = await getDb();
  await database.execute(
    `UPDATE transactions SET type=$1, amount=$2, amount_usd=$3, dollar_type=$4, category=$5, subcategory=$6, description=$7, date=$8
     WHERE id=$9`,
    [tx.type, tx.amount, tx.amount_usd ?? null, tx.dollar_type ?? null, tx.category, tx.subcategory ?? null, tx.description ?? null, tx.date, tx.id]
  );
  return tx;
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
  const database = await getDb();

  const incomeResult = await database.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='income' AND date >= $1 AND date <= $2`,
    [startDate, endDate]
  );

  const expenseResult = await database.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='expense' AND date >= $1 AND date <= $2`,
    [startDate, endDate]
  );

  const categoryResult = await database.select<CategorySummary[]>(
    `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
     FROM transactions WHERE type='expense' AND date >= $1 AND date <= $2
     GROUP BY category ORDER BY total DESC`,
    [startDate, endDate]
  );

  const total_income = incomeResult[0]?.total ?? 0;
  const total_expenses = expenseResult[0]?.total ?? 0;

  return {
    total_income,
    total_expenses,
    balance: total_income - total_expenses,
    by_category: categoryResult,
  };
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

const ALLOWED_TABLES = ['transactions', 'settings', 'error_logs'] as const;
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
