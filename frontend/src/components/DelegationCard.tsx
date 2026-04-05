import React from 'react';
import { Trash2, Clock, Bot, Fingerprint, KeyRound } from 'lucide-react';
import { cn, timeAgo, shortDid } from '@/lib/utils';
import type { Delegation } from '@/lib/types';

interface DelegationCardProps {
  delegation: Delegation;
  onRevoke?: (id: string) => void;
}

export const DelegationCard: React.FC<DelegationCardProps> = ({ delegation, onRevoke }) => {
  const isRevoked = delegation.status === 'revoked';

  return (
    <div className={cn(
      'rounded-lg bg-white border border-[#E8E5DE] px-3 py-2.5',
      isRevoked && 'opacity-50',
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <Bot className="w-3.5 h-3.5 text-[#B08D3E]" />
        <span className="text-xs font-medium text-[#1A1814]">{delegation.agent_name}</span>
        <span className="flex items-center gap-1 text-[9px] text-[#9C978E] ml-auto">
          <Clock className="w-3 h-3" />
          {delegation.ttl}
        </span>
      </div>

      {/* DIDs - cryptographic identity */}
      {delegation.agent_did && (
        <div className="mb-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-2.5 h-2.5 text-[#9C978E]" />
            <span className="text-[8px] text-[#9C978E] font-mono">agent: {shortDid(delegation.agent_did)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-2.5 h-2.5 text-[#9C978E]" />
            <span className="text-[8px] text-[#9C978E] font-mono">root: {shortDid(delegation.root_did)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {delegation.scopes.map(scope => (
          <span
            key={scope}
            className="text-[9px] px-1.5 py-0.5 rounded bg-[#B08D3E]/10 text-[#B08D3E] border border-[#B08D3E]/20"
          >
            {scope}
          </span>
        ))}
        {onRevoke && !isRevoked && (
          <button
            aria-label={`Revoke delegation for ${delegation.agent_name}`}
            onClick={e => { e.stopPropagation(); onRevoke(delegation.id); }}
            className="ml-auto p-1 rounded hover:bg-red-500/10 text-[#9C978E] hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        {isRevoked && (
          <span className="ml-auto text-[9px] text-red-500 font-medium">REVOKED</span>
        )}
      </div>
    </div>
  );
};
