import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Rule502030Mapping,
  loadOrMergeMapping,
  saveRule502030Mapping,
  pruneMappingToKnownExpenseCategories,
  ensureMappingCoversCategories,
} from '../lib/budgetRuleMapping';
import { Rule502030Percentages } from '../types';
import { DEFAULT_PERCENTAGES } from '../lib/budgetRule';
import { getSetting, setSetting } from '../lib/db';

const PERCENTAGES_KEY = 'rule502030_percentages';

export function useRule502030Mapping(expenseCategories: string[]) {
  const [mapping, setMapping] = useState<Rule502030Mapping | null>(null);
  const [percentages, setPercentages] = useState<Rule502030Percentages>(DEFAULT_PERCENTAGES);
  const catKey = useMemo(() => expenseCategories.join('\0'), [expenseCategories]);

  const refresh = useCallback(async () => {
    const [m, raw] = await Promise.all([
      loadOrMergeMapping(expenseCategories),
      getSetting(PERCENTAGES_KEY),
    ]);
    setMapping(m);
    if (raw) {
      try {
        setPercentages(JSON.parse(raw) as Rule502030Percentages);
      } catch {
        setPercentages(DEFAULT_PERCENTAGES);
      }
    }
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

  const updatePercentages = useCallback(async (next: Rule502030Percentages) => {
    await setSetting(PERCENTAGES_KEY, JSON.stringify(next));
    setPercentages(next);
  }, []);

  return {
    mapping,
    percentages,
    refresh,
    updateMapping,
    updatePercentages,
    loading: mapping === null,
  };
}
