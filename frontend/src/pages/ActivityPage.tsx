import React from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useActivity } from '@/hooks/useActivity';

export const ActivityPage: React.FC = () => {
  const { entries, stats } = useActivity();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Activity className="w-5 h-5 text-[#B08D3E]" />
        <h1 className="text-lg font-bold text-[#1A1814]">Enforcement Log</h1>
        <span className="text-[10px] text-[#9C978E] bg-[#F0EDE6] px-2 py-0.5 rounded-full">
          {stats.total} decisions
        </span>
      </motion.div>

      <p className="text-xs text-[#6B6560]">
        Every agent action passes through the double gate. This log shows every
        ALLOWED and BLOCKED decision with the reason.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Decisions" value={stats.total} icon={Activity} />
        <StatCard label="Allowed" value={stats.allowed} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Blocked" value={stats.blocked} icon={XCircle} color="text-red-600" />
      </div>

      {/* Full feed */}
      <ActivityFeed entries={entries} limit={50} />
    </div>
  );
};
