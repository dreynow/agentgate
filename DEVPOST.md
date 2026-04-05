# AgentGate: Two-Layer Authorization for AI Agents

## Inspiration

AI agents are proliferating - they read emails, create releases, file issues, deploy code. But the security model hasn't caught up. Most agent frameworks hand agents an API key and hope for the best. The key answers "can this agent access GitHub?" but not "is this agent authorized to create a release right now, and who said so?"

These are two fundamentally different questions. Credentials (what can you access?) and authority (what are you allowed to do?) are different security layers that need different solutions. We built AgentGate to enforce both.

## What it does

AgentGate implements a **double gate pattern** for AI agent authorization:

**Layer 1 - Auth0 Token Vault (Credentials):** The human connects their external accounts (GitHub, Gmail) through Auth0's Connected Accounts flow. Token Vault securely stores and manages the OAuth tokens. Agents never see raw credentials.

**Layer 2 - Kanoniv Agent Auth (Authority):** The human delegates scoped, time-limited authority to specific agents using Ed25519 cryptographic delegation. Each delegation specifies exactly which actions the agent can perform and for how long.

**The Double Gate:** When an agent tries to act, both layers must pass:
1. Kanoniv verifies: "Does this agent have a valid delegation for this action?" If not -> BLOCKED
2. Only if authorized, Token Vault releases the API credentials for the external service
3. The agent executes the action with both authority and credentials verified
4. Every action is signed and logged for audit

The app includes two demo agents:
- **support-agent** - reads GitHub issues and searches repositories
- **deploy-agent** - creates GitHub releases

The dashboard shows real-time enforcement decisions (ALLOWED/BLOCKED) with full audit trails.

## How we built it

**Backend:** Python/FastAPI with three integration layers:
- Auth0 SDK for Universal Login + Connected Accounts + Token Vault exchange
- kanoniv-auth for Ed25519 cryptographic delegation and verification
- httpx for GitHub API calls

**Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 with Framer Motion animations. Five pages: Dashboard, Connections (Token Vault), Delegations (Kanoniv), Agent Runner, and Activity Log.

**Deployment:** Multi-stage Dockerfile builds the React frontend and serves it from FastAPI's static file handler. Single container, zero external dependencies beyond Auth0 and GitHub APIs.

## Auth0 Token Vault integration

Token Vault is integrated at three points:

1. **Connected Accounts flow** - `/auth/connect/github` redirects through Auth0 to GitHub with `connection_scope=repo read:org` and `access_type=offline`. Auth0 handles the OAuth dance and stores GitHub's tokens in Token Vault.

2. **Token exchange** - When an agent needs GitHub credentials, the backend exchanges the user's Auth0 refresh token for a GitHub access token using Token Vault's federated connection grant type. The exchange happens server-side; the agent never sees the Auth0 refresh token.

3. **Double gate enforcement** - Token Vault credentials are only retrieved AFTER Kanoniv confirms the agent's delegation is valid. This is the key insight: verify authority first, release credentials second. If an agent's delegation has expired or been revoked, Token Vault tokens are never fetched.

## Challenges we ran into

The biggest challenge was understanding the Token Vault token exchange flow. The Connected Accounts flow requires specific Auth0 configuration: the social connection must have "Use Refresh Tokens" enabled, the application needs the Token Vault grant type, and the authorize request needs `prompt=consent` and `access_type=offline` to ensure Auth0 gets a refresh token from GitHub.

We also had to design the double gate to be order-independent but semantically correct. You could check credentials first and authority second, but checking authority first is more secure - you never fetch tokens you won't use, and the audit trail captures the delegation verification before any credential access.

## Accomplishments that we're proud of

- The double gate pattern is clean and composable. Any agent framework can adopt it.
- Kanoniv delegations are cryptographically verified offline - no network call needed.
- The activity log shows exactly why each action was ALLOWED or BLOCKED with delegation details.
- The frontend is polished with real-time updates and clear two-layer visualization.

## What we learned

Credentials and authority are complementary but distinct security layers. Token Vault solves the credential management problem elegantly - agents don't handle OAuth flows or refresh tokens. But credentials alone don't answer "should this agent be doing this?" That's where cryptographic delegation fills the gap. The combination is more powerful than either alone.

## What's next

- **MCP integration** - Kanoniv's `wrap-mcp` proxy can enforce delegation on any MCP server. Combined with Token Vault, every MCP tool call gets both layers of authorization.
- **More providers** - Gmail, Slack, Salesforce via Token Vault Connected Accounts.
- **Delegation attenuation** - Sub-delegating with narrower scopes (agent delegates to sub-agent with fewer permissions).
- **Reputation scoring** - Agents that consistently use authority responsibly build reputation over time.

## Built With

- auth0
- token-vault
- kanoniv-agent-auth
- python
- fastapi
- react
- typescript
- tailwindcss
- vite
- ed25519
- docker

---

## Blog Post: Two Layers of Trust - Why AI Agents Need Both Credentials and Authority

*This blog post covers the Token Vault integration pattern we discovered while building AgentGate.*

### The gap in agent security

Here's a common pattern in agent frameworks today:

```python
agent = Agent(
    tools=[GitHubTool(token=os.environ["GITHUB_TOKEN"])],
)
agent.run("Create a release for v2.0")
```

The agent has a GitHub token. It can create releases, delete repos, modify workflows - anything the token allows. There's no concept of "you're authorized to create releases but not delete repos" or "your authorization expires in 30 minutes."

This is the credentials-vs-authority gap. The token is a credential (proof of access). What's missing is authority (proof of permission to act).

### Token Vault solves the credential problem

Auth0 Token Vault handles the messy parts of credential management:

1. **OAuth flows** - Users connect accounts through Auth0's Universal Login. The agent never touches OAuth redirects, refresh tokens, or token rotation.

2. **Secure storage** - Tokens live in Auth0's infrastructure, not in environment variables or config files that get committed to git.

3. **Scoped access** - Connected Accounts let users choose exactly which permissions to grant: "read issues" but not "admin access."

4. **Token exchange** - When an agent needs a GitHub token, it exchanges the user's Auth0 session for a scoped external token. The exchange is server-side and auditable.

This is excellent. But it only answers "can this agent access GitHub?" It doesn't answer "should this agent be creating releases right now?"

### Delegation solves the authority problem

Kanoniv Agent Auth adds the authority layer using cryptographic delegation:

```python
from kanoniv_auth import delegate, verify

# Human creates a time-limited, scoped delegation
token = delegate(
    scopes=["github.issues.list", "github.issues.search"],
    ttl="2h",
    name="support-agent",
)

# Later, agent presents the delegation
result = verify(action="github.issues.list", token=token)
# result.valid = True, result.ttl_remaining = "1h47m"

result = verify(action="github.releases.create", token=token)
# result.valid = False - scope not granted
```

Key properties:
- **Offline verification** - Ed25519 signatures verify without network calls
- **Time-limited** - Every delegation has a TTL. Authority expires automatically.
- **Scoped** - Delegations list exactly which actions are permitted
- **Attenuated** - Sub-delegations can only narrow scope, never widen it
- **Auditable** - Every verification is logged with cryptographic signatures

### The double gate pattern

The insight is that these layers should be checked in sequence, not in isolation:

```python
def double_gate(action, delegation_token, agent_name):
    # Step 1: Does this agent have AUTHORITY? (Kanoniv)
    auth_result = verify(action=action, token=delegation_token)
    if not auth_result["valid"]:
        log_blocked(agent_name, action, "No valid delegation")
        return BLOCKED

    # Step 2: Get CREDENTIALS (Token Vault)
    # Only reached if authority is verified
    github_token = token_vault_exchange(refresh_token, "github")

    # Step 3: Execute with both layers satisfied
    return execute_with_token(action, github_token)
```

Why check authority first?

1. **No wasted token fetches** - If delegation is expired, we never call Token Vault
2. **Cleaner audit trail** - The log shows "BLOCKED: delegation expired" not "token fetched but action denied"
3. **Fail-fast** - Delegation verification is local (microseconds). Token exchange is a network call (milliseconds).

### What this means for agent builders

If you're building agents that call external APIs:

1. **Use Token Vault for credentials.** Don't store API tokens in env vars. Let Auth0 handle OAuth flows, refresh, and revocation.

2. **Add an authority layer.** Whether it's Kanoniv or something else, agents should present proof of authorization for each action, not just proof of access.

3. **Check authority before credentials.** It's more secure and more efficient.

4. **Make it auditable.** Every ALLOWED/BLOCKED decision should be logged with the delegation details, not just "access denied."

The future of agent security isn't choosing between credentials and authority. It's enforcing both.

---

*AgentGate is open source at [github.com/dreynow/agentgate](https://github.com/dreynow/agentgate). Kanoniv Agent Auth is available at [github.com/kanoniv/agent-auth](https://github.com/kanoniv/agent-auth).*
