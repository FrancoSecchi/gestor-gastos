import { getSetting, setSetting } from './db';
import { format, addMonths, subMonths, parseISO, isAfter, isValid } from 'date-fns';

export type IndexType = 'ICL' | 'IPC';

export interface HousingAdjustment {
  date: string;        // yyyy-MM-dd
  // IPC → variación acumulada del período en % (ej: 45.2)
  // ICL → nivel del índice BCRA (ej: 3500.25)
  indexValue: number;
  amount: number;
}

export interface HousingContract {
  startDate: string;
  initialAmount: number;
  indexType: IndexType;
  frequencyMonths: number;
  durationMonths: number;
  // ICL → nivel del índice al inicio del contrato. IPC → no se usa en cálculos.
  initialIndexValue: number;
  adjustments: HousingAdjustment[];
}

export function getContractEndDate(contract: HousingContract): string {
  return format(addMonths(parseISO(contract.startDate), contract.durationMonths), 'yyyy-MM-dd');
}

export interface ChartPoint {
  date: string;
  actualAmount?: number;
  projectedAmount?: number;
}

const KEY = 'housing_contract';
const BCRA_ICL_VARIABLE = 40;
const ARGLY_BASE = 'https://api.argly.com.ar/api';

// --- Persistencia ---

function isValidContract(c: unknown): c is HousingContract {
  if (!c || typeof c !== 'object') return false;
  const contract = c as Record<string, unknown>;
  if (typeof contract.startDate !== 'string' || !isValid(parseISO(contract.startDate))) return false;
  if (typeof contract.initialAmount !== 'number' || contract.initialAmount <= 0) return false;
  if (typeof contract.frequencyMonths !== 'number' || contract.frequencyMonths <= 0) return false;
  if (typeof contract.durationMonths !== 'number' || contract.durationMonths <= 0) return false;
  return true;
}

export async function loadHousingContract(): Promise<HousingContract | null> {
  const raw = await getSetting(KEY);
  if (!raw || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidContract(parsed)) return null;
    // Ensure adjustments is always an array even if stored data is missing the field
    return { ...parsed, adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [] };
  } catch {
    return null;
  }
}

export async function saveHousingContract(contract: HousingContract): Promise<void> {
  await setSetting(KEY, JSON.stringify(contract));
}

export async function deleteHousingContract(): Promise<void> {
  await setSetting(KEY, 'null');
}

// --- Cálculos ---

export function getAmountForDate(contract: HousingContract, date: string): number {
  const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
  const d = parseISO(date);
  let amount = contract.initialAmount;
  for (const adj of sorted) {
    if (!isAfter(parseISO(adj.date), d)) {
      amount = adj.amount;
    } else {
      break;
    }
  }
  return amount;
}

export function getCurrentAmount(contract: HousingContract): number {
  return getAmountForDate(contract, format(new Date(), 'yyyy-MM-dd'));
}

export function getAccumulatedRent(contract: HousingContract): number {
  const todayDate = new Date();
  const startDate = parseISO(contract.startDate);
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let total = 0;
  while (cursor <= todayDate) {
    total += getAmountForDate(contract, format(cursor, 'yyyy-MM-dd'));
    cursor = addMonths(cursor, 1);
  }
  return total;
}

export function getNextAdjustmentDate(contract: HousingContract): string {
  const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
  const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : contract.startDate;
  return format(addMonths(parseISO(lastDate), contract.frequencyMonths), 'yyyy-MM-dd');
}

export function getLastICLValue(contract: HousingContract): number {
  const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.length > 0 ? sorted[sorted.length - 1].indexValue : contract.initialIndexValue;
}

export function getLastAmount(contract: HousingContract): number {
  const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.length > 0 ? sorted[sorted.length - 1].amount : contract.initialAmount;
}

/**
 * Calcula el nuevo monto según el tipo de índice:
 * - IPC: indexValue = variación acumulada del período en % (ej: 45.2)
 * - ICL: indexValue = nuevo nivel del índice BCRA (ej: 3500.25)
 */
export function calculateNewAmount(contract: HousingContract, indexValue: number): number {
  const lastAmount = getLastAmount(contract);
  if (contract.indexType === 'IPC') {
    return Math.round(lastAmount * (1 + indexValue / 100));
  } else {
    const lastICL = getLastICLValue(contract);
    if (lastICL === 0) return lastAmount;
    return Math.round(lastAmount * (indexValue / lastICL));
  }
}

export function buildChartData(contract: HousingContract): ChartPoint[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = getContractEndDate(contract);
  const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));

  const periodDates = new Set<string>([contract.startDate, endDate]);
  for (const adj of sorted) {
    if (adj.date <= endDate) periodDates.add(adj.date);
  }

  const lastKnownDate = sorted.length > 0 ? sorted[sorted.length - 1].date : contract.startDate;
  const freq = contract.frequencyMonths > 0 ? contract.frequencyMonths : 0;
  if (freq > 0) {
    let projDate = format(addMonths(parseISO(lastKnownDate), freq), 'yyyy-MM-dd');
    let safety = 0;
    while (projDate <= endDate && safety < 500) {
      periodDates.add(projDate);
      projDate = format(addMonths(parseISO(projDate), freq), 'yyyy-MM-dd');
      safety++;
    }
  }

  const dates = [...periodDates].sort();
  const points: ChartPoint[] = [];

  for (const date of dates) {
    const amount = getAmountForDate(contract, date);
    if (date <= today) {
      points.push({ date, actualAmount: amount, projectedAmount: undefined });
    } else {
      if (points.length > 0 && points[points.length - 1].projectedAmount === undefined) {
        const prev = points[points.length - 1];
        prev.projectedAmount = prev.actualAmount;
      }
      points.push({ date, actualAmount: undefined, projectedAmount: amount });
    }
  }

  return points;
}

// --- APIs ---

interface ArglyItem {
  mes: number;
  anio: number;
  nombre_mes: string;
  valor: number;
}

interface ArglyResponse {
  data: ArglyItem[];
}

/**
 * IPC — argly.com.ar
 * Devuelve la variación acumulada compuesta del período en % (ej: 45.2).
 * desde / hasta en formato 'YYYY-MM'
 */
export async function fetchIPCAccumulated(desde: string, hasta: string): Promise<number> {
  const url = `${ARGLY_BASE}/ipc/range?desde=${desde}&hasta=${hasta}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`argly API error: ${res.status}`);
  const json: ArglyResponse = await res.json();
  if (!json.data || json.data.length === 0) {
    throw new Error('No hay datos de IPC para ese período en argly. Es posible que aún no estén publicados.');
  }
  // Acumular las variaciones mensuales de forma compuesta
  let factor = 1;
  for (const item of json.data) {
    factor *= 1 + item.valor / 100;
  }
  return parseFloat(((factor - 1) * 100).toFixed(2));
}

/**
 * ICL — BCRA API
 * Devuelve el nivel actual del índice ICL.
 */
interface BCRAResult { fecha: string; valor: number }
interface BCRAResponse { status: number; results: BCRAResult[] }

export async function fetchICLValue(): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const fromStr = format(from, 'yyyy-MM-dd');
  const url = `https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/${BCRA_ICL_VARIABLE}/${fromStr}/${today}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BCRA API error: ${res.status}`);
  const data: BCRAResponse = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('No se encontraron datos de ICL en BCRA.');
  }
  return data.results[data.results.length - 1].valor;
}

// --- Ajustes automáticos ---

export interface PendingAdjustment {
  date: string;        // yyyy-MM-dd — fecha del ajuste
  periodFrom: string;  // yyyy-MM   — inicio del período IPC acumulado
  periodTo: string;    // yyyy-MM   — fin del período IPC acumulado
}

/**
 * Devuelve las fechas de ajuste sin registrar, en orden cronológico:
 * - Todas las pasadas (≤ hoy) que no tienen ajuste.
 * - También la próxima fecha futura (la inmediatamente siguiente a hoy), porque
 *   el IPC a veces se publica antes de que llegue el mes del ajuste.
 *
 * periodFrom incluye el mes del inicio/último ajuste (no el mes siguiente),
 * de modo que el acumulado del índice abarca el período correcto.
 */
export function getPendingAdjustments(contract: HousingContract): PendingAdjustment[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = getContractEndDate(contract);
  const existingDates = new Set(contract.adjustments.map(a => a.date));

  const pending: PendingAdjustment[] = [];
  let lastDate = contract.startDate;
  let adjDate = format(addMonths(parseISO(contract.startDate), contract.frequencyMonths), 'yyyy-MM-dd');

  while (adjDate <= endDate) {
    const isPast = adjDate <= today;

    if (!existingDates.has(adjDate)) {
      pending.push({
        date: adjDate,
        // Desde el mes del propio inicio/último ajuste (inclusive)
        periodFrom: format(parseISO(lastDate), 'yyyy-MM'),
        // Hasta el mes ANTERIOR al ajuste: el mes del ajuste no entra en el cálculo
        periodTo: format(subMonths(parseISO(adjDate), 1), 'yyyy-MM'),
      });
      // Solo intentar una fecha futura: si ya la agregamos, parar
      if (!isPast) break;
    }

    lastDate = adjDate;
    adjDate = format(addMonths(parseISO(adjDate), contract.frequencyMonths), 'yyyy-MM-dd');
  }

  return pending;
}

export interface ApplyResult {
  applied: HousingAdjustment[];
  failed: { date: string; error: string }[];
}

/**
 * Para cada ajuste pendiente, intenta obtener el índice de la API y calcula el monto.
 * Los ajustes se aplican en orden cronológico para que cada cálculo use el monto anterior correcto.
 */
export async function fetchPendingAdjustments(
  contract: HousingContract,
  pending: PendingAdjustment[],
): Promise<ApplyResult> {
  const applied: HousingAdjustment[] = [];
  const failed: { date: string; error: string }[] = [];

  // Copia mutable para ir acumulando los ajustes aplicados en cada iteración
  let current: HousingContract = {
    ...contract,
    adjustments: [...contract.adjustments],
  };

  for (const p of pending) {
    try {
      let indexValue: number;
      if (contract.indexType === 'IPC') {
        indexValue = await fetchIPCAccumulated(p.periodFrom, p.periodTo);
      } else {
        indexValue = await fetchICLValue();
      }
      const amount = calculateNewAmount(current, indexValue);
      const adj: HousingAdjustment = { date: p.date, indexValue, amount };
      applied.push(adj);
      // Acumular para el próximo cálculo
      current = {
        ...current,
        adjustments: [...current.adjustments, adj].sort((a, b) => a.date.localeCompare(b.date)),
      };
    } catch (e) {
      failed.push({ date: p.date, error: e instanceof Error ? e.message : 'Error desconocido' });
    }
  }

  return { applied, failed };
}
