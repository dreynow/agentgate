# AgentGate - Two-Layer Authorization for AI Agents

**Auth0 Token Vault** secures the credentials. **Kanoniv Agent Auth** secures the authority. Together, the complete auth stack for autonomous AI agents.

Built for the [Authorized to Act](https://authorizedtoact.devpost.com/) hackathon.

## The Problem

AI agents are getting API keys and doing things. But API keys answer "can this agent access GitHub?" - not "is this agent authorized to create releases right now?" These are two different questions that need two different layers:

- **Layer 1 - Credentials (Auth0 Token Vault):** Which external services can this agent access?
- **Layer 2 - Authority (Kanoniv Agent Auth):** What specific actions is this agent authorized to perform, for how long, and who said so?

AgentGate enforces both layers. An agent must pass the **double gate** before any action proceeds.

## Demo Flow

```
1. Human logs in via Auth0 Universal Login
2. Human connects GitHub via Auth0 Token Vault (Connected Accounts)
3. Human delegates authority to agents via Kanoniv:
   - "support-agent" can read issues (2h TTL)
   - "deploy-agent" can create releases (30min TTL)
4. Agent tries to act:
   - Kanoniv checks: "Is this agent authorized for this action?" -> ALLOWED / BLOCKED
   - Token Vault provides: GitHub API token (only if Kanoniv says ALLOWED)
5. Dashboard shows real-time enforcement log
```

## Architecture

```
Human
  |
  v
Auth0 Universal Login --> Auth0 Token Vault (GitHub tokens)
  |                              |
  v                              v
Kanoniv Delegation ---------> Double Gate ---------> Agent Action
(Ed25519 crypto)          (verify THEN release)    (GitHub API call)
  |                              |
  v                              v
Audit Trail              Activity Log (ALLOWED/BLOCKED)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Backend | Python FastAPI |
| Auth | Auth0 Universal Login + Token Vault |
| Agent Auth | kanoniv-auth (Ed25519 cryptographic delegation) |
| External APIs | GitHub API (issues, releases) |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Auth0 account with Token Vault enabled
- `pip install kanoniv-auth`

### Setup

```bash
# Clone
git clone https://github.com/dreynow/agentgate.git
cd agentgate

# Backend
cd backend
cp ../.env.example .env   # Edit with your Auth0 credentials
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Auth0 Dashboard Setup

1. Create a **Regular Web Application**
2. Enable grant types: Authorization Code, Refresh Token, Token Vault
3. Add GitHub as a social connection with "Authentication and Connected Accounts for Token Vault"
4. Enable "Use Refresh Tokens" on the GitHub connection
5. Set Allowed Callback URLs: `http://localhost:8000/auth/callback`
6. Set Allowed Logout URLs: `http://localhost:5173`

### Docker

```bash
docker compose up --build
# App available at http://localhost:8000
```

## Auth0 Token Vault Integration

AgentGate uses Token Vault through three integration points:

### 1. Connected Accounts (`/auth/connect/github`)

Redirects to Auth0 which redirects to GitHub for authorization. Auth0 stores the GitHub OAuth tokens securely in Token Vault. The user explicitly consents to which services agents can access.

### 2. Token Exchange (`/auth/token-vault/github`)

Exchanges the user's Auth0 refresh token for the stored GitHub access token using the federated connection access token grant type:

```python
POST https://{domain}/oauth/token
{
    "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
    "subject_token": refresh_token,
    "subject_token_type": "urn:ietf:params:oauth:token-type:refresh_token",
    "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
    "connection": "github"
}
```

### 3. Double Gate (`/agents/{name}/execute`)

Before releasing Token Vault credentials to an agent, the double gate verifies the agent's Kanoniv delegation. Authority first, credentials second:

```python
def double_gate(action, delegation_token, agent_name):
    # Layer 2: Verify Kanoniv delegation (authority)
    result = verify_action(action, delegation_token)
    if not result["valid"]:
        return {"allowed": False, "reason": "No authority"}

    # Layer 1: Release Token Vault credentials
    return {"allowed": True, "reason": "Authority verified - credentials released"}
```

## Kanoniv Agent Auth Integration

[Kanoniv Agent Auth](https://github.com/kanoniv/agent-auth) provides cryptographic delegation for AI agents:

- **Ed25519 key pairs** - Root key (human) delegates to agent keys
- **Scoped authority** - `github.issues.list`, `github.releases.create`, etc.
- **Time-limited** - TTL on every delegation (30min, 2h, 24h)
- **Offline verification** - No network call needed to verify a delegation
- **Signed audit trail** - Every action gets a cryptographic signature

## Pages

| Page | Purpose |
|------|---------|
| Dashboard | Two-layer overview, stats, quick actions |
| Connections | Auth0 Token Vault - connect/disconnect external accounts |
| Delegations | Kanoniv - grant/revoke agent authority with scopes + TTL |
| Agents | Execute actions through the double gate |
| Activity | Full enforcement log with ALLOWED/BLOCKED decisions |

## License

MIT
