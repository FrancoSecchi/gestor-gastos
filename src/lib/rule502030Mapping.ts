import { getSetting, setSetting } from './db';
import { EXPENSE_CATEGORIES, Rule502030Group } from '../types';

export type Rule502030Mapping = Record<Rule502030Group, string[]>;

const KEY = 'rule502030_category_groups';

const GROUP_ORDER: Rule502030Group[] = ['Necesidades', 'Deseos', 'Ahorro/Inversión'];

export function getDefaultRule502030Mapping(): Rule502030Mapping {
  return {
    'Necesidades': [...EXPENSE_CATEGORIES.Necesidades],
    'Deseos': [...EXPENSE_CATEGORIES.Deseos],
    'Ahorro/Inversión': [...EXPENSE_CATEGORIES['Ahorro/Inversión']],
  };
}

function normalizeParsedMapping(parsed: unknown): Rule502030Mapping {
  const def = getDefaultRule502030Mapping();
  if (!parsed || typeof parsed !== 'object') return def;
  const o = parsed as Record<string, unknown>;
  const out: Rule502030Mapping = { ...def };
  for (const g of GROUP_ORDER) {
    const v = o[g];
    if (Array.isArray(v)) {
      out[g] = v.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean);
    }
  }
  return out;
}

export async function loadRule502030Mapping(): Promise<Rule502030Mapping> {
  const raw = await getSetting(KEY);
  if (!raw) return getDefaultRule502030Mapping();
  try {
    return normalizeParsedMapping(JSON.parse(raw));
  } catch {
    return getDefaultRule502030Mapping();
  }
}

function dedupeMapping(m: Rule502030Mapping): Rule502030Mapping {
  const seen = new Set<string>();
  const result = getDefaultRule502030Mapping();
  for (const g of GROUP_ORDER) {
    result[g] = [];
    for (const c of m[g]) {
      if (!seen.has(c)) {
        seen.add(c);
        result[g].push(c);
      }
    }
  }
  return result;
}

export function mappingEquals(a: Rule502030Mapping, b: Rule502030Mapping): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pruneMappingToKnownExpenseCategories(
  mapping: Rule502030Mapping,
  expenseCategories: string[]
): Rule502030Mapping {
  const known = new Set(expenseCategories);
  const r: Rule502030Mapping = {
    'Necesidades': [],
    'Deseos': [],
    'Ahorro/Inversión': [],
  };
  for (const g of GROUP_ORDER) {
    r[g] = mapping[g].filter(c => known.has(c));
  }
  return r;
}

export function ensureMappingCoversCategories(
  mapping: Rule502030Mapping,
  allExpenseCategoryNames: string[]
): Rule502030Mapping {
  const inMapping = new Set(Object.values(mapping).flat());
  const missing = allExpenseCategoryNames.filter(c => !inMapping.has(c));
  if (missing.length === 0) return mapping;
  return {
    ...mapping,
    Deseos: [...mapping.Deseos, ...missing],
  };
}

export async function saveRule502030Mapping(m: Rule502030Mapping): Promise<void> {
  await setSetting(KEY, JSON.stringify(dedupeMapping(m)));
}

export async function loadOrMergeMapping(expenseCategories: string[]): Promise<Rule502030Mapping> {
  const loaded = await loadRule502030Mapping();
  
  // Obtener todas las categorías del mapping guardado
  const savedCategories = new Set(Object.values(loaded).flat());
  
  // Encontrar categorías nuevas que no estaban en el mapping guardado
  const newCategories = expenseCategories.filter(c => !savedCategories.has(c));
  
  // Si hay nuevas categorías, agregarlas a "Deseos" y guardar
  if (newCategories.length > 0) {
    const merged = {
      ...loaded,
      Deseos: [...loaded.Deseos, ...newCategories],
    };
    await saveRule502030Mapping(merged);
    return merged;
  }
  
  return loaded;
}

export function mappingToAssignment(map: Rule502030Mapping): Record<string, Rule502030Group> {
  const a: Record<string, Rule502030Group> = {};
  for (const g of GROUP_ORDER) {
    for (const c of map[g]) {
      if (!(c in a)) a[c] = g;
    }
  }
  return a;
}

export function assignmentToMapping(assign: Record<string, Rule502030Group>): Rule502030Mapping {
  const r: Rule502030Mapping = {
    'Necesidades': [],
    'Deseos': [],
    'Ahorro/Inversión': [],
  };
  for (const [cat, g] of Object.entries(assign)) {
    if (GROUP_ORDER.includes(g as Rule502030Group)) {
      r[g as Rule502030Group].push(cat);
    }
  }
  return r;
}

export function buildAssignmentForCategories(
  categories: string[],
  mapping: Rule502030Mapping | null
): Record<string, Rule502030Group> {
  const base = mapping ? mappingToAssignment(mapping) : {};
  const out: Record<string, Rule502030Group> = { ...base };
  for (const c of categories) {
    if (!(c in out)) out[c] = 'Deseos';
  }
  return out;
}
