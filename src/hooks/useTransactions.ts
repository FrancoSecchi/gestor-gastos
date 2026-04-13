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
    // Optimistic update: assume success and add to state immediately
    const optimisticTx: Transaction = {
      id: `temp_${Date.now()}`,
      ...tx,
      created_at: new Date().toISOString(),
      receipt_path: null,
      recurring_id: null,
    };
    
    setTransactions(prev => [...prev, optimisticTx]);
    
    try {
      const newTx = await createTransaction(tx);
      // Replace temp with real transaction
      setTransactions(prev => prev.map(t => t.id === optimisticTx.id ? newTx : t));
      // Sync summary
      const newSummary = await getSummary(startDate, endDate);
      setSummary(newSummary);
      return newTx;
    } catch (err) {
      await refresh(startDate, endDate);
      await logError('useTransactions.addTransaction', err);
      throw err;
    }
  }, [startDate, endDate, refresh]);

  const editTransaction = useCallback(async (tx: Transaction): Promise<Transaction> => {
    // Optimistic update
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    
    try {
      const updated = await updateTransaction(tx);
      // Ensure state matches DB
      setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
      // Sync summary
      const newSummary = await getSummary(startDate, endDate);
      setSummary(newSummary);
      return updated;
    } catch (err) {
      await refresh(startDate, endDate);
      await logError('useTransactions.editTransaction', err);
      throw err;
    }
  }, [startDate, endDate, refresh]);

  const removeTransaction = useCallback(async (id: string): Promise<void> => {
    // Optimistic update
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    try {
      await deleteTransaction(id);
      // Sync summary
      const newSummary = await getSummary(startDate, endDate);
      setSummary(newSummary);
    } catch (err) {
      await refresh(startDate, endDate);
      await logError('useTransactions.removeTransaction', err);
      throw err;
    }
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
