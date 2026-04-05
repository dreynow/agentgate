import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import { DECISION_COLORS } from '@/lib/constants';
import type { ActivityEntry } from '@/lib/types';

interface ActivityFeedProps {
  entries: ActivityEntry[];
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ entries, limit = 20 }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const items = entries.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-[#9C978E] text-xs">
        No activity yet. Delegate authority to an agent and run an action.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((entry, i) => {
        const isExp = expanded === i;
        const colors = DECISION_COLORS[entry.decision] || 'bg-zinc-500/10 text-[#6B6560] border-zinc-500/20';
        return (
          <motion.div
            key={`${entry.timestamp}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              'rounded-lg bg-white border cursor-pointer transition-colors',
              isExp ? 'border-[#B08D3E]/30' : 'border-[#E8E5DE] hover:border-[#E8E5DE]',
            )}
            onClick={() => setExpanded(isExp ? null : i)}
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xs font-medium text-[#1A1814] min-w-[100px]">{entry.agent_name}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', colors)}>
                {entry.decision}
              </span>
              <span className="text-[10px] font-mono text-[#9C978E] truncate flex-1">
                {entry.action}
              </span>
              <span className="text-[10px] text-[#9C978E] shrink-0">{timeAgo(entry.timestamp)}</span>
            </div>
            {isExp && (
              <div className="px-3 pb-2.5 border-t border-[#E8E5DE]">
                <div className="mt-2 space-y-1">
                  <div className="text-[9px] text-[#9C978E]">
                    <span className="font-semibold">Reason:</span> {entry.reason}
                  </div>
                  {entry.scopes.length > 0 && (
                    <div className="text-[9px] text-[#9C978E]">
                      <span className="font-semibold">Scopes:</span> {entry.scopes.join(', ')}
                    </div>
                  )}
                  {entry.ttl_remaining != null && (
                    <div className="text-[9px] text-[#9C978E]">
                      <span className="font-semibold">TTL remaining:</span> {entry.ttl_remaining}s
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
