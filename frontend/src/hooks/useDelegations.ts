import { useState, useEffect, useCallback } from 'react';
import { fetchDelegations } from '@/lib/api';
import type { Delegation } from '@/lib/types';

export function useDelegations() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await fetchDelegations();
      setDelegations(data);
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { delegations, loading, refetch };
}
