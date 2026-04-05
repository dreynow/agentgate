import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Link2, Activity, Bot, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useConnections } from '@/hooks/useConnections';
import { useDelegations } from '@/hooks/useDelegations';
import { useActivity } from '@/hooks/useActivity';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { connections } = useConnections();
  const { delegations } = useDelegations();
  const { entries, stats } = useActivity();

  const activeConnections = connections.filter(c => c.status === 'connected').length;
  const activeDelegations = delegations.filter(d => d.status === 'active').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Shield className="w-5 h-5 text-[#B08D3E]" />
        <h1 className="text-lg font-bold text-[#1A1814]">AgentGate Dashboard</h1>
      </motion.div>

      {/* Two-Layer Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="rounded-xl bg-white border border-[#E8E5DE] p-4"
      >
        <div className="flex items-center gap-8 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1814]">Layer 1: Auth0 Token Vault</div>
              <div className="text-[10px] text-[#9C978E]">Which APIs can the agent access?</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#B08D3E]" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#B08D3E]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#B08D3E]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1814]">Layer 2: Kanoniv Agent Auth</div>
              <div className="text-[10px] text-[#9C978E]">What is the agent authorized to do?</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1814]">Agent Executes</div>
              <div className="text-[10px] text-[#9C978E]">Both gates pass - action proceeds</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-4 gap-3"
      >
        <StatCard label="Allowed" value={stats.allowed} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Blocked" value={stats.blocked} icon={XCircle} color="text-red-600" />
        <StatCard label="Active Delegations" value={activeDelegations} icon={Shield} color="text-[#B08D3E]" />
        <StatCard label="Connections" value={activeConnections} icon={Link2} color="text-blue-600" />
      </motion.div>

      {/* Two columns: Quick Actions + Activity */}
      <div className="grid grid-cols-5 gap-4">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-2 space-y-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-3.5 h-3.5 text-[#B08D3E]" />
            <span className="text-xs font-semibold text-[#6B6560]">Quick Actions</span>
          </div>
          <button
            onClick={() => navigate('/connections')}
            className="w-full rounded-lg bg-white border border-[#E8E5DE] px-4 py-3 text-left hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-[#1A1814]">Manage Connections</span>
            </div>
            <span className="text-[10px] text-[#9C978E] mt-1 block">Connect external APIs via Token Vault</span>
          </button>
          <button
            onClick={() => navigate('/delegations')}
            className="w-full rounded-lg bg-white border border-[#E8E5DE] px-4 py-3 text-left hover:border-[#B08D3E]/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#B08D3E]" />
              <span className="text-xs font-medium text-[#1A1814]">Grant Delegation</span>
            </div>
            <span className="text-[10px] text-[#9C978E] mt-1 block">Delegate scoped authority to an agent</span>
          </button>
          <button
            onClick={() => navigate('/agents')}
            className="w-full rounded-lg bg-white border border-[#E8E5DE] px-4 py-3 text-left hover:border-emerald-500/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-[#1A1814]">Run Agent</span>
            </div>
            <span className="text-[10px] text-[#9C978E] mt-1 block">Execute an agent action through the double gate</span>
          </button>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-[#B08D3E]" />
            <span className="text-xs font-semibold text-[#6B6560]">Enforcement Log</span>
            <span className="text-[9px] text-[#9C978E] ml-auto">{stats.total} total</span>
          </div>
          <ActivityFeed entries={entries} limit={8} />
        </motion.div>
      </div>
    </div>
  );
};
