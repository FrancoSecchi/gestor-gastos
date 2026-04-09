import { useState, useCallback, useEffect } from 'react';
import { DollarRate, DollarCache } from '../types';
import { getSetting, setSetting } from '../lib/db';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const DOLLAR_API_URL = 'https://dolarapi.com/v1/dolares';

interface UseDollarRateReturn {
  rates: DollarRate[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useDollarRate(): UseDollarRateReturn {
  const [rates, setRates] = useState<DollarRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchRates = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      if (!force) {
        const cached = await getSetting('dollar_cache');
        if (cached) {
          const cacheData: DollarCache = JSON.parse(cached);
          if (Date.now() - cacheData.timestamp < CACHE_DURATION) {
            setRates(cacheData.rates);
            setLastUpdate(new Date(cacheData.timestamp));
            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(DOLLAR_API_URL);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data: DollarRate[] = await response.json();
      const cache: DollarCache = {
        rates: data,
        timestamp: Date.now(),
      };

      await setSetting('dollar_cache', JSON.stringify(cache));
      setRates(data);
      setLastUpdate(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener cotizaciones';
      setError(message);

      // Try loading from cache even if expired
      try {
        const cached = await getSetting('dollar_cache');
        if (cached) {
          const cacheData: DollarCache = JSON.parse(cached);
          setRates(cacheData.rates);
          setLastUpdate(new Date(cacheData.timestamp));
        }
      } catch {
        // No cache available
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    loading,
    error,
    lastUpdate,
    refresh: () => fetchRates(true),
  };
}
