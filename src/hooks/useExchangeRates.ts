import { useState, useCallback, useEffect, useRef } from 'react';
import { CurrencyCode, ExchangeRates, ExchangeRatesCache } from '../types';
import { getSetting, setSetting } from '../lib/db';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';
// ARS is not available on frankfurter; we use a fallback label
const TARGET_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'MAD', 'ARS'];

interface UseExchangeRatesReturn {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useExchangeRates(baseCurrency: CurrencyCode): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchRates = useCallback(async (force = false) => {
    // ARS uses the separate dolarapi.com flow; skip this hook
    if (baseCurrency === 'ARS') {
      setRates(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const cacheKey = `exchange_rates_cache_${baseCurrency}`;

    try {
      if (!force && Date.now() - lastFetchRef.current < CACHE_DURATION) {
        const cached = await getSetting(cacheKey);
        if (cached) {
          const cacheData: ExchangeRatesCache = JSON.parse(cached);
          if (Date.now() - cacheData.timestamp < CACHE_DURATION) {
            setRates(cacheData.data);
            setLastUpdate(new Date(cacheData.timestamp));
            setLoading(false);
            return;
          }
        }
      }

      // Frankfurter doesn't support ARS as a target, so we request without it
      const targets = TARGET_CURRENCIES.filter(c => c !== baseCurrency && c !== 'ARS').join(',');
      const url = `${FRANKFURTER_URL}?from=${baseCurrency}&to=${targets}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const json = await response.json();
      const timestamp = Date.now();

      const data: ExchangeRates = {
        base: baseCurrency,
        rates: json.rates ?? {},
        timestamp,
      };

      const cachePayload: ExchangeRatesCache = { data, timestamp };
      await setSetting(cacheKey, JSON.stringify(cachePayload));
      lastFetchRef.current = timestamp;
      setRates(data);
      setLastUpdate(new Date(timestamp));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener tipos de cambio';
      setError(message);

      // Try expired cache
      try {
        const cached = await getSetting(cacheKey);
        if (cached) {
          const cacheData: ExchangeRatesCache = JSON.parse(cached);
          setRates(cacheData.data);
          setLastUpdate(new Date(cacheData.timestamp));
        }
      } catch {
        // No cache available
      }
    } finally {
      setLoading(false);
    }
  }, [baseCurrency]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { rates, loading, error, lastUpdate, refresh: () => fetchRates(true) };
}
