import { getSetting, setSetting, renameTransactionCategory } from './db';
import { ALL_EXPENSE_CATEGORIES, ALL_INCOME_CATEGORIES } from '../types';

const KEY_CUSTOM_EXPENSE = 'custom_expense_categories';
const KEY_CUSTOM_INCOME = 'custom_income_categories';

function parseNames(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(x => x.trim());
  } catch {
    return [];
  }
}

const builtInExpenseLower = new Set(ALL_EXPENSE_CATEGORIES.map(c => c.toLowerCase()));
const builtInIncomeLower = new Set(ALL_INCOME_CATEGORIES.map(c => c.toLowerCase()));

export async function getCustomExpenseCategories(): Promise<string[]> {
  return parseNames(await getSetting(KEY_CUSTOM_EXPENSE));
}

export async function getCustomIncomeCategories(): Promise<string[]> {
  return parseNames(await getSetting(KEY_CUSTOM_INCOME));
}

export async function setCustomExpenseCategories(names: string[]): Promise<void> {
  const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
  await setSetting(KEY_CUSTOM_EXPENSE, JSON.stringify(unique));
}

export async function setCustomIncomeCategories(names: string[]): Promise<void> {
  const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
  await setSetting(KEY_CUSTOM_INCOME, JSON.stringify(unique));
}

export async function addCustomExpenseCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const low = trimmed.toLowerCase();
  if (builtInExpenseLower.has(low)) {
    throw new Error('Esa categoría ya existe en las categorías de gasto por defecto.');
  }
  const current = await getCustomExpenseCategories();
  if (current.some(c => c.toLowerCase() === low)) {
    throw new Error('Ya agregaste una categoría con ese nombre.');
  }
  await setCustomExpenseCategories([...current, trimmed]);
}

export async function addCustomIncomeCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const low = trimmed.toLowerCase();
  if (builtInIncomeLower.has(low)) {
    throw new Error('Esa categoría ya existe en las categorías de ingreso por defecto.');
  }
  const current = await getCustomIncomeCategories();
  if (current.some(c => c.toLowerCase() === low)) {
    throw new Error('Ya agregaste una categoría con ese nombre.');
  }
  await setCustomIncomeCategories([...current, trimmed]);
}

export async function removeCustomExpenseCategory(name: string): Promise<void> {
  const current = await getCustomExpenseCategories();
  await setCustomExpenseCategories(current.filter(c => c !== name));
}

export async function removeCustomIncomeCategory(name: string): Promise<void> {
  const current = await getCustomIncomeCategories();
  await setCustomIncomeCategories(current.filter(c => c !== name));
}

export async function renameCustomExpenseCategory(oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('El nombre no puede estar vacío.');
  const low = trimmed.toLowerCase();
  if (builtInExpenseLower.has(low)) throw new Error('Ese nombre ya existe en las categorías por defecto.');
  const current = await getCustomExpenseCategories();
  if (current.some(c => c !== oldName && c.toLowerCase() === low)) {
    throw new Error('Ya existe una categoría con ese nombre.');
  }
  await setCustomExpenseCategories(current.map(c => (c === oldName ? trimmed : c)));
  await renameTransactionCategory(oldName, trimmed);
}

export async function renameCustomIncomeCategory(oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('El nombre no puede estar vacío.');
  const low = trimmed.toLowerCase();
  if (builtInIncomeLower.has(low)) throw new Error('Ese nombre ya existe en las categorías por defecto.');
  const current = await getCustomIncomeCategories();
  if (current.some(c => c !== oldName && c.toLowerCase() === low)) {
    throw new Error('Ya existe una categoría con ese nombre.');
  }
  await setCustomIncomeCategories(current.map(c => (c === oldName ? trimmed : c)));
  await renameTransactionCategory(oldName, trimmed);
}
