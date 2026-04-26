import { getDb } from './db';
import { InvestmentAsset, InvestmentMovement, NewInvestmentMovement, Position } from '../types/investments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function getInvestmentAssets(): Promise<InvestmentAsset[]> {
  const db = await getDb();
  return db.select<InvestmentAsset[]>('SELECT * FROM investment_assets ORDER BY ticker');
}

export async function getInvestmentMovements(): Promise<InvestmentMovement[]> {
  const db = await getDb();
  return db.select<InvestmentMovement[]>(
    'SELECT * FROM investment_movements ORDER BY date DESC, created_at DESC'
  );
}

export async function addInvestmentMovement(m: NewInvestmentMovement): Promise<InvestmentMovement> {
  const db = await getDb();
  const id = generateId();
  const created_at = new Date().toISOString();

  await db.execute(
    'INSERT INTO investment_movements (id, ticker, type, quantity, price_usd, date, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, m.ticker, m.type, m.quantity, m.price_usd, m.date, m.notes ?? null, created_at]
  );

  return { id, created_at, ticker: m.ticker, type: m.type, quantity: m.quantity, price_usd: m.price_usd, date: m.date, notes: m.notes ?? null };
}

export async function deleteInvestmentMovement(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM investment_movements WHERE id=$1', [id]);
}

export async function updateInvestmentMovement(id: string, m: NewInvestmentMovement): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE investment_movements SET ticker=$1, type=$2, quantity=$3, price_usd=$4, date=$5, notes=$6 WHERE id=$7',
    [m.ticker, m.type, m.quantity, m.price_usd, m.date, m.notes ?? null, id]
  );
}

export function calculatePositions(movements: InvestmentMovement[]): Position[] {
  const byTicker: Record<string, InvestmentMovement[]> = {};

  for (const m of movements) {
    if (!byTicker[m.ticker]) byTicker[m.ticker] = [];
    byTicker[m.ticker].push(m);
  }

  const positions: Position[] = [];

  for (const [ticker, mvs] of Object.entries(byTicker)) {
    let qty = 0;
    let totalCost = 0;
    let totalBuyQty = 0;

    // Process chronologically for correct avg price
    const sorted = [...mvs].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
    for (const m of sorted) {
      if (m.type === 'buy') {
        totalCost += m.quantity * m.price_usd;
        totalBuyQty += m.quantity;
        qty += m.quantity;
      } else {
        qty -= m.quantity;
      }
    }

    if (qty <= 0.0001) continue;

    const avgBuyPrice = totalBuyQty > 0 ? totalCost / totalBuyQty : 0;
    const investedUsd = qty * avgBuyPrice;

    positions.push({
      ticker,
      qty,
      avgBuyPrice,
      investedUsd,
      currentPrice: null,
      currentValueUsd: null,
      pnlUsd: null,
      pnlPct: null,
    });
  }

  return positions.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function enrichPositions(positions: Position[], prices: Record<string, number | null>): Position[] {
  return positions.map(pos => {
    const currentPrice = prices[pos.ticker] ?? null;
    if (currentPrice === null) return pos;
    const currentValueUsd = pos.qty * currentPrice;
    const pnlUsd = currentValueUsd - pos.investedUsd;
    const pnlPct = pos.investedUsd > 0 ? (pnlUsd / pos.investedUsd) * 100 : 0;
    return { ...pos, currentPrice, currentValueUsd, pnlUsd, pnlPct };
  });
}

/** Cumulative invested capital by date (for line chart). */
export function buildCumulativeCapital(movements: InvestmentMovement[]): { date: string; invested: number }[] {
  const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const result: { date: string; invested: number }[] = [];

  for (const m of sorted) {
    running += m.type === 'buy' ? m.quantity * m.price_usd : -(m.quantity * m.price_usd);
    const last = result[result.length - 1];
    if (last?.date === m.date) {
      last.invested = running;
    } else {
      result.push({ date: m.date, invested: Math.max(0, running) });
    }
  }

  return result;
}
