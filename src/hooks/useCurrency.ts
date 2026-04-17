import { useState, useCallback, useEffect } from 'react';
import { CurrencyCode, CurrencyInfo, SUPPORTED_CURRENCIES } from '../types';
import { getSetting, setSetting } from '../lib/db';

const SETTING_KEY = 'selected_currency';
const DEFAULT_CURRENCY: CurrencyCode = 'ARS';

interface UseCurrencyReturn {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  loading: boolean;
}

export function useCurrency(): UseCurrencyReturn {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetting(SETTING_KEY).then(stored => {
      if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
        setCurrencyCode(stored as CurrencyCode);
      }
    }).finally(() => setLoading(false));
  }, []);

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    await setSetting(SETTING_KEY, code);
    setCurrencyCode(code);
  }, []);

  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)!;

  return { currency, setCurrency, loading };
}
