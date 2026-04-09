import { useState, useCallback, useEffect, useMemo } from 'react';
import { ALL_EXPENSE_CATEGORIES, ALL_INCOME_CATEGORIES, mergeCategoryLists } from '../types';
import {
  getCustomExpenseCategories,
  getCustomIncomeCategories,
  addCustomExpenseCategory,
  addCustomIncomeCategory,
  removeCustomExpenseCategory,
  removeCustomIncomeCategory,
  renameCustomExpenseCategory,
  renameCustomIncomeCategory,
} from '../lib/customCategories';

export function useCustomCategories() {
  const [expenseCustom, setExpenseCustom] = useState<string[]>([]);
  const [incomeCustom, setIncomeCustom] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [e, i] = await Promise.all([
        getCustomExpenseCategories(),
        getCustomIncomeCategories(),
      ]);
      setExpenseCustom(e);
      setIncomeCustom(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const expenseCategories = useMemo(
    () => mergeCategoryLists(ALL_EXPENSE_CATEGORIES, expenseCustom),
    [expenseCustom]
  );

  const incomeCategories = useMemo(
    () => mergeCategoryLists(ALL_INCOME_CATEGORIES, incomeCustom),
    [incomeCustom]
  );

  const addExpense = useCallback(async (name: string) => {
    await addCustomExpenseCategory(name);
    await refresh();
  }, [refresh]);

  const addIncome = useCallback(async (name: string) => {
    await addCustomIncomeCategory(name);
    await refresh();
  }, [refresh]);

  const removeExpense = useCallback(async (name: string) => {
    await removeCustomExpenseCategory(name);
    await refresh();
  }, [refresh]);

  const removeIncome = useCallback(async (name: string) => {
    await removeCustomIncomeCategory(name);
    await refresh();
  }, [refresh]);

  const renameExpense = useCallback(async (oldName: string, newName: string) => {
    await renameCustomExpenseCategory(oldName, newName);
    await refresh();
  }, [refresh]);

  const renameIncome = useCallback(async (oldName: string, newName: string) => {
    await renameCustomIncomeCategory(oldName, newName);
    await refresh();
  }, [refresh]);

  return {
    loading,
    expenseCustom,
    incomeCustom,
    expenseCategories,
    incomeCategories,
    refresh,
    addExpense,
    addIncome,
    removeExpense,
    removeIncome,
    renameExpense,
    renameIncome,
  };
}
