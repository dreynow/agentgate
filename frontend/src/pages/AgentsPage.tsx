import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, CheckCircle2, XCircle, AlertTriangle, LogIn, KeyRound, Shield, Fingerprint } from 'lucide-react';
import { executeAgent } from '@/lib/api';
import { useDelegations } from '@/hooks/useDelegations';
import { useActivity } from '@/hooks/useActivity';
import { useAuth } from '@/hooks/useAuth';
import { cn, shortDid } from '@/lib/utils';
import type { AgentExecResult } from '@/lib/types';

const DEFAULT_REPO = 'kanoniv/agent-auth';

// Derive a readable label from a scope string: "github.issues.list" -> "List issues"
function scopeLabel(scope: string): string {
  const parts = scope.split('.');
  if (parts.length < 2) return scope;
  const verb = parts[parts.length - 1];
  const resource = parts[parts.length - 2];
  return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${resource}`;
}

// Derive default params from the scope string
function scopeParams(scope: string): Record<string, string> {
  return { repo: DEFAULT_REPO };
}

export const AgentsPage: React.FC = () => {
  const { delegations } = useDelegations();
  const { refetch: refetchActivity } = useActivity();
  const { isAuthenticated, githubToken, vaultError, login, fetchGithubToken } = useAuth();
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AgentExecResult | null>(null);
  const [manualToken, setManualToken] = useState('');

  const activeToken = githubToken || manualToken;

  // Build agent list dynamically from active delegations
  const activeDelegations = delegations.filter(d => d.status === 'active');
  const agentNames = [...new Set(activeDelegations.map(d => d.agent_name))];

  const handleExecute = async (agentName: string, action: string, params: Record<string, string>) => {
    const delegation = delegations.find(d => d.agent_name === agentName && d.status === 'active');
    if (!delegation) {
      setLastResult({
        success: false, action, agent: agentName,
        error: 'No active delegation found. Grant a delegation first.',
        decision: 'BLOCKED',
      });
      return;
    }

    // Client-side scope check - instant BLOCKED
    if (!delegation.scopes.includes(action)) {
      setLastResult({
        success: false, action, agent: agentName,
        error: `Action "${action}" not in delegation scope. Delegated scopes: [${delegation.scopes.join(', ')}]`,
        decision: 'BLOCKED',
      });
      return;
    }

    if (!activeToken) {
      setLastResult({
        success: false, action, agent: agentName,
        error: 'No GitHub token. Login with Auth0 to get a Token Vault token, or paste one manually.',
        decision: 'BLOCKED',
      });
      return;
    }

    setRunning(`${agentName}:${action}`);
    setLastResult(null);

    const result = await executeAgent(agentName, action, params, delegation.token, activeToken);
    setLastResult(result);
    setRunning(null);
    refetchActivity();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Bot className="w-5 h-5 text-emerald-600" />
        <h1 className="text-lg font-bold text-[#1A1814]">Agent Runner</h1>
        <span className="text-[10px] text-[#9C978E] bg-emerald-500/10 px-2 py-0.5 rounded-full">
          Double Gate Enforcement
        </span>
      </motion.div>

      <p className="text-xs text-[#6B6560]">
        Execute agent actions through the double gate. Each action is verified against
        the Kanoniv delegation before Token Vault credentials are released.
      </p>

      {/* Token Vault status */}
      <div className="rounded-lg bg-white border border-[#E8E5DE] px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[9px] font-semibold text-[#9C978E] uppercase tracking-wider">
            Layer 1: GitHub Credentials
          </span>
        </div>

        {githubToken ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs text-emerald-600 font-medium">Token Vault connected</span>
            <span className="text-[9px] text-[#9C978E]">- GitHub token retrieved automatically via Auth0</span>
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-600 font-medium">Token Vault exchange pending</span>
              {vaultError && <span className="text-[9px] text-red-500">{vaultError}</span>}
            </div>
            <button
              onClick={fetchGithubToken}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              Retry Token Vault Exchange
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-[#9C978E]" />
              <span className="text-xs text-[#6B6560]">Login with Auth0 + GitHub to auto-retrieve token</span>
            </div>
            <button
              onClick={login}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B08D3E] text-white text-xs font-medium hover:bg-[#C5A572] transition-colors"
            >
              <LogIn className="w-3 h-3" />
              Login with Auth0
            </button>
          </div>
        )}

        {/* Manual fallback */}
        {!githubToken && (
          <div className="border-t border-[#E8E5DE] pt-2 mt-2">
            <label className="text-[9px] text-[#9C978E] mb-1 block">Or paste a GitHub token manually:</label>
            <input
              type="password"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full px-3 py-1.5 text-xs bg-[#FAFAF8] border border-[#E8E5DE] rounded-lg text-[#1A1814] placeholder-[#9C978E] focus:border-[#B08D3E]/50 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Dynamic agent cards from delegations */}
      {agentNames.length === 0 ? (
        <div className="text-center py-12 text-[#9C978E] text-xs">
          No agents yet. Go to Delegations to create an agent and grant it authority.
        </div>
      ) : (
        agentNames.map(agentName => {
          const delegation = activeDelegations.find(d => d.agent_name === agentName);
          if (!delegation) return null;

          return (
            <motion.div
              key={agentName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-white border border-[#E8E5DE] p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-[#B08D3E]" />
                <span className="text-sm font-semibold text-[#1A1814]">{agentName}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Shield className="w-2.5 h-2.5 inline mr-0.5" />delegated
                </span>
                {activeToken && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <KeyRound className="w-2.5 h-2.5 inline mr-0.5" />credentials ready
                  </span>
                )}
              </div>

              {/* Agent DID */}
              {delegation.agent_did && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Fingerprint className="w-3 h-3 text-[#9C978E]" />
                  <span className="text-[8px] font-mono text-[#9C978E]">{shortDid(delegation.agent_did)}</span>
                </div>
              )}

              {/* Scopes */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {delegation.scopes.map(scope => (
                  <span key={scope} className="text-[9px] px-1.5 py-0.5 rounded bg-[#F0EDE6] text-[#6B6560]">
                    {scope}
                  </span>
                ))}
              </div>

              {/* Action buttons - generated from delegated scopes */}
              <div className="flex gap-2 flex-wrap">
                {delegation.scopes.map(scope => (
                  <button
                    key={scope}
                    onClick={() => handleExecute(agentName, scope, scopeParams(scope))}
                    disabled={running !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E5DE] text-xs font-medium text-[#6B6560] hover:border-emerald-500/30 hover:text-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {running === `${agentName}:${scope}` ? (
                      <div className="w-3 h-3 border-2 border-[#9C978E] border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {scopeLabel(scope)}
                  </button>
                ))}

                {/* Out-of-scope test buttons - pick scopes from other agents */}
                {activeDelegations
                  .flatMap(d => d.scopes)
                  .filter(scope => !delegation.scopes.includes(scope))
                  .filter((scope, i, arr) => arr.indexOf(scope) === i)
                  .slice(0, 2)
                  .map(scope => (
                    <button
                      key={`oos-${scope}`}
                      onClick={() => handleExecute(agentName, scope, scopeParams(scope))}
                      disabled={running !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-400 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" />
                      {scopeLabel(scope)}
                      <span className="text-[8px] opacity-60">out of scope</span>
                    </button>
                  ))}
              </div>
            </motion.div>
          );
        })
      )}

      {/* Last result */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-xl border p-4',
            lastResult.success
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20',
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.decision === 'ALLOWED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {lastResult.decision === 'BLOCKED' && <XCircle className="w-4 h-4 text-red-600" />}
            {lastResult.decision === 'ERROR' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            <span className="text-xs font-semibold text-[#1A1814]">
              {lastResult.agent} - {lastResult.action}
            </span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border font-medium',
              lastResult.success
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 border-red-500/20',
            )}>
              {lastResult.decision}
            </span>
          </div>
          {lastResult.error && (
            <div className="text-[10px] text-red-600">{lastResult.error}</div>
          )}
          {lastResult.result && (
            <pre className="text-[9px] text-[#6B6560] mt-2 overflow-x-auto bg-white/50 rounded p-2">
              {JSON.stringify(lastResult.result, null, 2)}
            </pre>
          )}
        </motion.div>
      )}
    </div>
  );
};
