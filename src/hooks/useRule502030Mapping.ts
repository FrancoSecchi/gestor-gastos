import { useState, useCallback, useEffect } from 'react';
import {
  Rule502030Mapping,
  loadOrMergeMapping,
  saveRule502030Mapping,
  pruneMappingToKnownExpenseCategories,
  ensureMappingCoversCategories,
} from '../lib/rule502030Mapping';

export function useRule502030Mapping(expenseCategories: string[]) {
  const [mapping, setMapping] = useState<Rule502030Mapping | null>(null);
  const catKey = expenseCategories.join('\0');

  const refresh = useCallback(async () => {
    const m = await loadOrMergeMapping(expenseCategories);
    setMapping(m);
  }, [catKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateMapping = useCallback(
    async (next: Rule502030Mapping) => {
      const pruned = pruneMappingToKnownExpenseCategories(next, expenseCategories);
      const merged = ensureMappingCoversCategories(pruned, expenseCategories);
      await saveRule502030Mapping(merged);
      setMapping(merged);
    },
    [catKey, expenseCategories]
  );

  return {
    mapping,
    refresh,
    updateMapping,
    loading: mapping === null,
  };
}
