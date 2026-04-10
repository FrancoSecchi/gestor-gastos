import { useState, useEffect, useCallback } from 'react';
import { RecurringPayment, NewRecurringPayment, RecurrenceFrequency } from '../types';
import {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
  logError,
} from '../lib/db';

export interface UseRecurringPaymentsReturn {
  recurringPayments: RecurringPayment[];
  loading: boolean;
  refresh: () => Promise<void>;
  addRecurring: (rp: NewRecurringPayment) => Promise<RecurringPayment>;
  editRecurring: (rp: RecurringPayment) => Promise<RecurringPayment>;
  toggleRecurring: (id: string, isActive: boolean) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
}

export function useRecurringPayments(): UseRecurringPaymentsReturn {
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getRecurringPayments();
      setRecurringPayments(data);
    } catch (err) {
      await logError('useRecurringPayments.refresh', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRecurring = useCallback(async (rp: NewRecurringPayment) => {
    const created = await createRecurringPayment(rp);
    await refresh();
    return created;
  }, [refresh]);

  const editRecurring = useCallback(async (rp: RecurringPayment) => {
    const updated = await updateRecurringPayment(rp);
    await refresh();
    return updated;
  }, [refresh]);

  const toggleRecurring = useCallback(async (id: string, isActive: boolean) => {
    const rp = (await getRecurringPayments()).find(r => r.id === id);
    if (!rp) return;
    await updateRecurringPayment({ ...rp, is_active: isActive ? 1 : 0 });
    await refresh();
  }, [refresh]);

  const removeRecurring = useCallback(async (id: string) => {
    await deleteRecurringPayment(id);
    await refresh();
  }, [refresh]);

  return { recurringPayments, loading, refresh, addRecurring, editRecurring, toggleRecurring, removeRecurring };
}

// Returns the date range (start, end as yyyy-MM-dd) for the current period given a frequency
export function getCurrentPeriodRange(frequency: RecurrenceFrequency, referenceDate: Date = new Date()): { start: string; end: string } {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth(); // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (year: number, month: number, day: number) =>
    `${year}-${pad(month + 1)}-${pad(day)}`;

  switch (frequency) {
    case 'monthly': {
      const start = fmt(y, m, 1);
      const end = fmt(y, m, new Date(y, m + 1, 0).getDate());
      return { start, end };
    }
    case 'bimonthly': {
      // Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec
      const periodStart = m % 2 === 0 ? m : m - 1;
      const periodEnd = periodStart + 1;
      const start = fmt(y, periodStart, 1);
      const end = fmt(y, periodEnd, new Date(y, periodEnd + 1, 0).getDate());
      return { start, end };
    }
    case 'quarterly': {
      const q = Math.floor(m / 3);
      const qStart = q * 3;
      const qEnd = qStart + 2;
      const start = fmt(y, qStart, 1);
      const end = fmt(y, qEnd, new Date(y, qEnd + 1, 0).getDate());
      return { start, end };
    }
    case 'semiannual': {
      const half = m < 6 ? 0 : 6;
      const halfEnd = half + 5;
      const start = fmt(y, half, 1);
      const end = fmt(y, halfEnd, new Date(y, halfEnd + 1, 0).getDate());
      return { start, end };
    }
    case 'annual': {
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
  }
}
