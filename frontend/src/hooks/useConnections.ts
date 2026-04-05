import { useState, useEffect, useCallback } from 'react';
import { fetchConnections } from '@/lib/api';
import type { Connection } from '@/lib/types';

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await fetchConnections();
      setConnections(data);
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { connections, loading, refetch };
}
