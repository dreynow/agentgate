import React from 'react';
import { Link2, Unlink, CheckCircle2, XCircle } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Connection } from '@/lib/types';

interface ConnectionCardProps {
  connection: Connection;
  onDisconnect?: (id: string) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection, onDisconnect }) => {
  const isConnected = connection.status === 'connected';

  return (
    <div className={cn(
      'rounded-lg bg-white border border-[#E8E5DE] px-4 py-3',
      !isConnected && 'opacity-60',
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isConnected ? 'bg-emerald-500/10' : 'bg-[#F0EDE6]',
        )}>
          <Link2 className={cn('w-4 h-4', isConnected ? 'text-emerald-600' : 'text-[#9C978E]')} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1A1814]">{connection.provider}</span>
            {isConnected
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              : <XCircle className="w-3.5 h-3.5 text-[#9C978E]" />
            }
          </div>
          <span className="text-[10px] text-[#9C978E]">
            {isConnected ? `Connected ${timeAgo(connection.connected_at)}` : 'Not connected'}
          </span>
        </div>
        {isConnected && onDisconnect && (
          <button
            onClick={() => onDisconnect(connection.id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#9C978E] hover:text-red-600 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {connection.scopes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-[#9C978E] font-semibold">Token Vault scopes:</span>
          {connection.scopes.map(scope => (
            <span
              key={scope}
              className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20"
            >
              {scope}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
