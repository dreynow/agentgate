export interface Connection {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  scopes: string[];
  connected_at: string;
}

export interface Delegation {
  id: string;
  agent_name: string;
  scopes: string[];
  ttl: string;
  token: string;
  agent_did: string;
  root_did: string;
  chain_depth: number;
  created_at: string;
  status: 'active' | 'revoked';
  revoked_at?: string;
}

export interface ActivityEntry {
  timestamp: string;
  agent_name: string;
  action: string;
  decision: 'ALLOWED' | 'BLOCKED' | 'ERROR';
  reason: string;
  scopes: string[];
  ttl_remaining: number | null;
  agent_did: string;
  root_did: string;
  chain_depth: number;
  provenance: string;
}

export interface AgentExecResult {
  success: boolean;
  action: string;
  agent: string;
  result?: Record<string, unknown>;
  error?: string;
  decision: string;
}

export interface Stats {
  total: number;
  allowed: number;
  blocked: number;
}
