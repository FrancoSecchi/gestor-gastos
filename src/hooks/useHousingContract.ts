import { useState, useCallback, useEffect } from 'react';
import {
  HousingContract,
  loadHousingContract,
  saveHousingContract,
  deleteHousingContract,
} from '../lib/housingContract';
import { getSetting, setSetting } from '../lib/db';

const HAS_RENTAL_KEY = 'housing_has_rental_contract';

export function useHousingContract() {
  const [contract, setContract] = useState<HousingContract | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [hasRentalContract, setHasRentalContract] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, raw] = await Promise.all([
        loadHousingContract(),
        getSetting(HAS_RENTAL_KEY),
      ]);
      setContract(c);
      setHasRentalContract(raw === 'true');
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

  const setHasRental = useCallback(async (value: boolean) => {
    await setSetting(HAS_RENTAL_KEY, String(value));
    setHasRentalContract(value);
  }, []);

  return {
    contract: contract === undefined ? null : contract,
    loading,
    hasRentalContract,
    setHasRental,
    save,
    remove,
    refresh,
  };
}
