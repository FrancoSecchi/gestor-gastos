import { useState, useEffect, useRef, useCallback } from 'react';
import { fetch } from '@tauri-apps/plugin-http';

export type StockPrices = Record<string, number | null>;

const REFRESH_INTERVAL = 60_000;
const MAX_FAILURES = 3;

function yahooUrl(ticker: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
}

async function fetchPrice(ticker: string): Promise<number> {
  const res = await fetch(yahooUrl(ticker));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const price: number = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== 'number') throw new Error('No price');
  return price;
}

export function useStockPrices(tickers: string[]) {
  const [prices, setPrices] = useState<StockPrices>({});
  const [loading, setLoading] = useState(false);
  const tickersKey = tickers.slice().sort().join(',');
  const tickersRef = useRef<string[]>(tickers);
  const failureCount = useRef(0);
  tickersRef.current = tickers;

  const fetchAll = useCallback(async () => {
    const current = tickersRef.current;
    if (current.length === 0) return;
    if (failureCount.current >= MAX_FAILURES) return;
    setLoading(true);

    const results = await Promise.allSettled(
      current.map(async ticker => ({ ticker, price: await fetchPrice(ticker) }))
    );

    const anySuccess = results.some(r => r.status === 'fulfilled');
    if (!anySuccess) {
      failureCount.current += 1;
    } else {
      failureCount.current = 0;
    }

    setPrices(prev => {
      const next: StockPrices = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') {
          next[r.value.ticker] = r.value.price;
        }
      }
      for (const t of current) {
        if (!(t in next)) next[t] = null;
      }
      return next;
    });

    setLoading(false);
  }, [tickersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { prices, loading, refresh: fetchAll };
}
