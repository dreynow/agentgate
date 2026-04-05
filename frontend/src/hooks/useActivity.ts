import { useState, useEffect, useCallback } from 'react';
import { fetchActivity, fetchStats } from '@/lib/api';
import type { ActivityEntry, Stats } from '@/lib/types';

export function useActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, allowed: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const [activityData, statsData] = await Promise.all([
        fetchActivity(),
        fetchStats(),
      ]);
      setEntries(activityData);
      setStats(statsData);
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { entries, stats, loading, refetch };
}
