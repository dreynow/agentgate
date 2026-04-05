const BASE = '';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(`${BASE}${path}`, { ...options, headers });
}

// Typed API helpers

export async function fetchConnections() {
  const resp = await apiFetch('/connections');
  const data = await resp.json();
  return data.connections;
}

export async function fetchDelegations() {
  const resp = await apiFetch('/delegations');
  const data = await resp.json();
  return data.delegations;
}

export async function createDelegation(agent_name: string, scopes: string[], ttl: string) {
  const resp = await apiFetch('/delegations', {
    method: 'POST',
    body: JSON.stringify({ agent_name, scopes, ttl }),
  });
  return resp.json();
}

export async function revokeDelegation(id: string) {
  const resp = await apiFetch(`/delegations/${id}`, { method: 'DELETE' });
  return resp.json();
}

export async function fetchActivity(limit = 50) {
  const resp = await apiFetch(`/agents/activity?limit=${limit}`);
  const data = await resp.json();
  return data.entries;
}

export async function fetchStats() {
  const resp = await apiFetch('/agents/stats');
  return resp.json();
}

export async function executeAgent(agentName: string, action: string, params: Record<string, unknown>, delegationToken: string, githubToken: string) {
  const resp = await apiFetch(`/agents/${agentName}/execute`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      params,
      delegation_token: delegationToken,
      github_token: githubToken,
    }),
  });
  return resp.json();
}
