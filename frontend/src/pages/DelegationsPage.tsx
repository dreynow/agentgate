import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus } from 'lucide-react';
import { DelegationCard } from '@/components/DelegationCard';
import { useDelegations } from '@/hooks/useDelegations';
import { createDelegation, revokeDelegation } from '@/lib/api';
import { EXPIRY_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ALL_SCOPES = [
  'github.issues.list',
  'github.issues.search',
  'github.issues.get',
  'github.releases.list',
  'github.releases.create',
];

export const DelegationsPage: React.FC = () => {
  const { delegations, refetch } = useDelegations();
  const [showForm, setShowForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [ttl, setTtl] = useState('2h');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!agentName.trim() || selectedScopes.length === 0) return;
    setCreating(true);
    await createDelegation(agentName.trim(), selectedScopes, ttl);
    setCreating(false);
    setShowForm(false);
    setAgentName('');
    setSelectedScopes([]);
    refetch();
  };

  const handleRevoke = async (id: string) => {
    await revokeDelegation(id);
    refetch();
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Shield className="w-5 h-5 text-[#B08D3E]" />
        <h1 className="text-lg font-bold text-[#1A1814]">Delegations</h1>
        <span className="text-[10px] text-[#9C978E] bg-[#B08D3E]/10 px-2 py-0.5 rounded-full">
          Layer 2: Authority
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B08D3E] text-white text-xs font-medium hover:bg-[#C5A572] transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Delegation
        </button>
      </motion.div>

      <p className="text-xs text-[#6B6560]">
        Create agents and grant them scoped, time-limited authority using Ed25519 cryptographic delegation.
        Each agent gets a unique DID (Decentralized Identifier).
      </p>

      {/* Create form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl bg-white border border-[#B08D3E]/20 p-4 space-y-4"
        >
          <div className="text-xs font-semibold text-[#1A1814]">Create Agent & Grant Delegation</div>

          {/* Agent name - free text */}
          <div>
            <label className="text-[9px] font-semibold text-[#9C978E] uppercase tracking-wider mb-1 block">Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="e.g. triage-bot, release-manager, code-reviewer"
              className="w-full px-3 py-2 text-xs bg-[#FAFAF8] border border-[#E8E5DE] rounded-lg text-[#1A1814] placeholder-[#9C978E] focus:border-[#B08D3E]/50 focus:outline-none"
            />
            <p className="text-[8px] text-[#9C978E] mt-1">A unique Ed25519 key pair and DID will be generated for this agent.</p>
          </div>

          {/* Scope selector */}
          <div>
            <label className="text-[9px] font-semibold text-[#9C978E] uppercase tracking-wider mb-1 block">Scopes</label>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_SCOPES.map(scope => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded border transition-colors',
                    selectedScopes.includes(scope)
                      ? 'bg-[#B08D3E]/10 text-[#B08D3E] border-[#B08D3E]/20'
                      : 'border-[#E8E5DE] text-[#9C978E] hover:text-[#6B6560]',
                  )}
                >
                  {scope}
                </button>
              ))}
              <button
                onClick={() => setSelectedScopes(ALL_SCOPES.slice())}
                className="text-[10px] px-2 py-1 rounded border border-[#E8E5DE] text-[#9C978E] hover:text-[#6B6560] transition-colors"
              >
                Select all
              </button>
            </div>
          </div>

          {/* TTL selector */}
          <div>
            <label className="text-[9px] font-semibold text-[#9C978E] uppercase tracking-wider mb-1 block">TTL (Time to Live)</label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTtl(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    ttl === opt.value
                      ? 'bg-[#B08D3E]/10 text-[#B08D3E] border-[#B08D3E]/20'
                      : 'border-[#E8E5DE] text-[#6B6560] hover:border-[#B08D3E]/20',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={!agentName.trim() || selectedScopes.length === 0 || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#B08D3E] text-white text-xs font-bold hover:bg-[#C5A572] transition-colors disabled:opacity-50"
          >
            {creating ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            {creating ? 'Creating...' : 'Create Agent & Grant Delegation'}
          </button>
        </motion.div>
      )}

      {/* Delegation list */}
      <div className="space-y-2">
        {delegations.length === 0 ? (
          <div className="text-center py-12 text-[#9C978E] text-xs">
            No agents yet. Create an agent and grant it authority to get started.
          </div>
        ) : (
          delegations.map(d => (
            <DelegationCard key={d.id} delegation={d} onRevoke={handleRevoke} />
          ))
        )}
      </div>
    </div>
  );
};
