import { useState, useEffect, useCallback } from 'react';
import { InvestmentAsset, InvestmentMovement, NewInvestmentMovement, Position } from '../types/investments';
import {
  getInvestmentAssets,
  getInvestmentMovements,
  addInvestmentMovement,
  deleteInvestmentMovement,
  updateInvestmentMovement,
  calculatePositions,
} from '../lib/investments';
import { logError } from '../lib/db';

export function useInvestments() {
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [movements, setMovements] = useState<InvestmentMovement[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([getInvestmentAssets(), getInvestmentMovements()]);
      setAssets(a);
      setMovements(m);
      setPositions(calculatePositions(m));
    } catch (err) {
      await logError('useInvestments.load', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMovement = useCallback(async (m: NewInvestmentMovement) => {
    await addInvestmentMovement(m);
    await load();
  }, [load]);

  const removeMovement = useCallback(async (id: string) => {
    await deleteInvestmentMovement(id);
    await load();
  }, [load]);

  const editMovement = useCallback(async (id: string, m: NewInvestmentMovement) => {
    await updateInvestmentMovement(id, m);
    await load();
  }, [load]);

  return { assets, movements, positions, loading, addMovement, removeMovement, editMovement };
}
