import { useState, useCallback, useEffect } from 'react';
import {
  HousingContract,
  loadHousingContract,
  saveHousingContract,
  deleteHousingContract,
} from '../lib/housingContract';

export function useHousingContract() {
  const [contract, setContract] = useState<HousingContract | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const c = await loadHousingContract();
      setContract(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (c: HousingContract) => {
    await saveHousingContract(c);
    setContract(c);
  }, []);

  const remove = useCallback(async () => {
    await deleteHousingContract();
    setContract(null);
  }, []);

  return {
    contract: contract === undefined ? null : contract,
    loading,
    save,
    remove,
    refresh,
  };
}
