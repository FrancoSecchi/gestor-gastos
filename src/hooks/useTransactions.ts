import { useState, useCallback, useEffect } from 'react';
import { Transaction, NewTransaction, Summary } from '../types';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  clearAllData,
  getSummary,
  getReadableError,
  logError,
} from '../lib/db';

interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;
  refresh: (startDate: string, endDate: string) => Promise<void>;
  addTransaction: (tx: NewTransaction) => Promise<Transaction>;
  editTransaction: (tx: Transaction) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  clearDatabase: () => Promise<void>;
}

export function useTransactions(startDate: string, endDate: string): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const [txs, sum] = await Promise.all([
        getTransactions(start, end),
        getSummary(start, end),
      ]);
      setTransactions(txs);
      setSummary(sum);
    } catch (err) {
      await logError('useTransactions.refresh', err);
      const message = getReadableError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(startDate, endDate);
  }, [startDate, endDate, refresh]);

  const addTransaction = useCallback(async (tx: NewTransaction): Promise<Transaction> => {
    const newTx = await createTransaction(tx);
    await refresh(startDate, endDate);
    return newTx;
  }, [startDate, endDate, refresh]);

  const editTransaction = useCallback(async (tx: Transaction): Promise<Transaction> => {
    const updated = await updateTransaction(tx);
    await refresh(startDate, endDate);
    return updated;
  }, [startDate, endDate, refresh]);

  const removeTransaction = useCallback(async (id: string): Promise<void> => {
    await deleteTransaction(id);
    await refresh(startDate, endDate);
  }, [startDate, endDate, refresh]);

  const clearDatabase = useCallback(async (): Promise<void> => {
    await clearAllData();
    await refresh(startDate, endDate);
  }, [startDate, endDate, refresh]);

  return {
    transactions,
    summary,
    loading,
    error,
    refresh,
    addTransaction,
    editTransaction,
    removeTransaction,
    clearDatabase,
  };
}
