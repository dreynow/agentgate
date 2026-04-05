import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Plus, ExternalLink } from 'lucide-react';
import { ConnectionCard } from '@/components/ConnectionCard';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

const PROVIDERS = [
  { id: 'github', label: 'GitHub', description: 'Repository access, issues, releases' },
  { id: 'google-oauth2', label: 'Gmail', description: 'Email reading and search' },
];

export const ConnectionsPage: React.FC = () => {
  const { connections, refetch } = useConnections();
  const { isAuthenticated, login } = useAuth();

  const handleDisconnect = async (id: string) => {
    await apiFetch(`/connections/${id}`, { method: 'DELETE' });
    refetch();
  };

  const handleConnect = (provider: string) => {
    // Redirect to Auth0 Connected Accounts flow via our backend
    window.location.href = `/auth/connect/${provider}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link2 className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-bold text-[#1A1814]">Token Vault Connections</h1>
        <span className="text-[10px] text-[#9C978E] bg-blue-500/10 px-2 py-0.5 rounded-full">
          Layer 1: Credentials
        </span>
      </motion.div>

      <p className="text-xs text-[#6B6560]">
        Auth0 Token Vault manages API credentials for external services.
        Connect your accounts here - agents can only access services you've authorized.
      </p>

      {!isAuthenticated && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <p className="text-xs text-amber-700 mb-2">
            Login with Auth0 first to connect external accounts.
          </p>
          <button
            onClick={login}
            className="px-4 py-2 rounded-lg bg-[#B08D3E] text-white text-xs font-medium hover:bg-[#C5A572] transition-colors"
          >
            Login with Auth0
          </button>
        </div>
      )}

      {/* Connected accounts */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-[#9C978E] uppercase tracking-wider">Connected</h2>
          {connections.map(conn => (
            <ConnectionCard key={conn.id} connection={conn} onDisconnect={handleDisconnect} />
          ))}
        </div>
      )}

      {/* Add new connection */}
      <div className="rounded-xl bg-white border border-dashed border-[#E8E5DE] p-6">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold text-[#6B6560]">Connect a new service via Auth0 Token Vault</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          {PROVIDERS.map(provider => {
            const isConnected = connections.some(c => c.id === provider.id);
            return (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                disabled={!isAuthenticated || isConnected}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg border border-[#E8E5DE] text-xs font-medium text-[#6B6560] hover:border-blue-500/30 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-1.5">
                  {isConnected ? (
                    <span className="text-emerald-600">Connected</span>
                  ) : (
                    <>
                      <ExternalLink className="w-3 h-3" />
                      <span>Connect {provider.label}</span>
                    </>
                  )}
                </div>
                <span className="text-[9px] text-[#9C978E] font-normal">{provider.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-[#F5F3EE] border border-[#E8E5DE] p-4">
        <h3 className="text-xs font-semibold text-[#6B6560] mb-2">How Token Vault Works</h3>
        <ol className="text-[10px] text-[#9C978E] space-y-1 list-decimal list-inside">
          <li>Click "Connect" to authorize AgentGate via Auth0</li>
          <li>Auth0 securely stores your API tokens in Token Vault</li>
          <li>When an agent needs credentials, it requests them through the double gate</li>
          <li>Tokens are only released after Kanoniv verifies the agent's delegation</li>
        </ol>
      </div>
    </div>
  );
};
