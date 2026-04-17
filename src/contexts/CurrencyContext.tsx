import React, { createContext, useContext, useCallback } from 'react';
import { CurrencyCode, CurrencyInfo } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import { formatARS } from '../lib/export';

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  /** Formats an amount with the correct symbol for the selected currency */
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { currency, setCurrency } = useCurrency();

  const fmt = useCallback((amount: number): string => {
    const n = formatARS(amount); // uses es-AR grouping (thousands dot, no decimals) — good for all currencies as it's just digit grouping
    switch (currency.code) {
      case 'USD': return `US$${n}`;
      case 'EUR': return `€${n}`;
      case 'MAD': return `MAD ${n}`;
      case 'ARS':
      default:    return `$${n}`;
    }
  }, [currency.code]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyFormat(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrencyFormat must be used within CurrencyProvider');
  return ctx;
}
