import { useState, useEffect, useCallback } from 'react';
import { Debt, NewDebt, DebtPayment, NewDebtPayment } from '../types';
import { getDebts, createDebt, updateDebt, deleteDebt, getDebtPayments, createDebtPayment, deleteDebtPayment, logError } from '../lib/db';

export interface DebtWithPayments extends Debt {
  payments: DebtPayment[];
  paid_amount: number;
  remaining_amount: number;
}

export function useDebts() {
  const [debts, setDebts] = useState<DebtWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rawDebts = await getDebts();
      const withPayments = await Promise.all(
        rawDebts.map(async (debt) => {
          const payments = await getDebtPayments(debt.id);
          const paid_amount = payments.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...debt,
            payments,
            paid_amount,
            remaining_amount: Math.max(0, debt.amount - paid_amount),
          };
        })
      );
      setDebts(withPayments);
    } catch (err) {
      await logError('useDebts.refresh', err);
      setError('Error al cargar deudas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDebt = useCallback(async (debt: NewDebt): Promise<Debt> => {
    const created = await createDebt(debt);
    await refresh();
    return created;
  }, [refresh]);

  const editDebt = useCallback(async (debt: Debt): Promise<void> => {
    await updateDebt(debt);
    await refresh();
  }, [refresh]);

  const removeDebt = useCallback(async (id: string): Promise<void> => {
    await deleteDebt(id);
    await refresh();
  }, [refresh]);

  const addPayment = useCallback(async (payment: NewDebtPayment): Promise<void> => {
    await createDebtPayment(payment);
    await refresh();
  }, [refresh]);

  const removePayment = useCallback(async (paymentId: string): Promise<void> => {
    await deleteDebtPayment(paymentId);
    await refresh();
  }, [refresh]);

  return {
    debts,
    loading,
    error,
    refresh,
    addDebt,
    editDebt,
    removeDebt,
    addPayment,
    removePayment,
  };
}
