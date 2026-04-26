import { useState, useEffect } from 'react';
import { fetch } from '@tauri-apps/plugin-http';

export type Range = '1mo' | '3mo' | '6mo' | '1y' | '2y' | 'max';

export interface PricePoint {
  timestamp: number;
  date: string;
  close: number;
}

const cache = new Map<string, PricePoint[]>();
const failed = new Set<string>();

function cacheKey(ticker: string, range: Range): string {
  return `${ticker}:${range}`;
}

async function fetchHistorical(ticker: string, range: Range): Promise<PricePoint[]> {
  const key = cacheKey(ticker, range);
  if (cache.has(key)) return cache.get(key)!;

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const result = data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    const ts = timestamps[i] * 1000;
    const date = new Date(ts).toISOString().slice(0, 10);
    points.push({ timestamp: ts, date, close });
  }

  cache.set(key, points);
  return points;
}

export function useHistoricalPrices(ticker: string, range: Range) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = cacheKey(ticker, range);

    if (cache.has(key)) {
      setData(cache.get(key)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Don't retry a key that already failed in this session
    if (failed.has(key)) {
      setData([]);
      setLoading(false);
      setError('No se pudo cargar el historial de precios.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHistorical(ticker, range)
      .then(points => {
        if (cancelled) return;
        setData(points);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        failed.add(key);
        setError('No se pudo cargar el historial de precios.');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [ticker, range]);

  const retry = () => {
    const key = cacheKey(ticker, range);
    failed.delete(key);
    // Trigger re-run by toggling — caller should handle via key prop if needed.
    // Simple approach: just clear error and re-fetch inline.
    setError(null);
    setLoading(true);
    fetchHistorical(ticker, range)
      .then(points => { setData(points); setLoading(false); })
      .catch(() => { failed.add(key); setError('No se pudo cargar el historial de precios.'); setLoading(false); });
  };

  return { data, loading, error, retry };
}
