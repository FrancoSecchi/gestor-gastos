import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_ICONS,
  FALLBACK_ICON,
  loadCategoryIcons,
  saveCategoryIcons,
} from '../lib/categoryIcons';

export function useCategoryIcons() {
  const [icons, setIcons] = useState<Record<string, string>>({ ...DEFAULT_ICONS });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const loaded = await loadCategoryIcons();
    setIcons(loaded);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setIcon = useCallback(async (category: string, icon: string) => {
    setIcons(prev => {
      const next = { ...prev, [category]: icon };
      saveCategoryIcons(next);
      return next;
    });
  }, []);

  const getIcon = useCallback((name: string) => {
    return icons[name] ?? FALLBACK_ICON;
  }, [icons]);

  return { icons, loading, setIcon, getIcon, refresh: load };
}
