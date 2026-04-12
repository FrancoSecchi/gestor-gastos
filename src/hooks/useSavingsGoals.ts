import { useState, useEffect, useCallback } from 'react';
import { getSavingsGoals, saveSavingsGoals } from '../lib/db';
import { SavingsGoal } from '../types';
import { v4 as uuidv4 } from '../lib/uuid';

function parseGoals(raw: string | null): SavingsGoal[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavingsGoal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getSavingsGoals();
      setGoals(parseGoals(raw));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  const persistGoals = useCallback(async (nextGoals: SavingsGoal[]) => {
    await saveSavingsGoals(JSON.stringify(nextGoals));
    setGoals(nextGoals);
  }, []);

  const addGoal = useCallback(async (goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>) => {
    const nextGoals = [
      ...goals,
      {
        ...goal,
        id: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    await persistGoals(nextGoals);
    return nextGoals;
  }, [goals, persistGoals]);

  const updateGoal = useCallback(async (goal: SavingsGoal) => {
    const nextGoals = goals.map(g => g.id === goal.id ? { ...goal, updated_at: new Date().toISOString() } : g);
    await persistGoals(nextGoals);
    return nextGoals;
  }, [goals, persistGoals]);

  const removeGoal = useCallback(async (goalId: string) => {
    const nextGoals = goals.filter(g => g.id !== goalId);
    await persistGoals(nextGoals);
    return nextGoals;
  }, [goals, persistGoals]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    goals,
    loading,
    error,
    refresh,
    addGoal,
    updateGoal,
    removeGoal,
  };
}
