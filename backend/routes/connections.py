"""Token Vault connection management routes."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from auth.auth0 import user_sessions

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.get("")
async def list_connections(request: Request):
    """List Token Vault connections for the current user."""
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)

    connected = session.get("connected_accounts", []) if session else []

    connections = []
    for provider in connected:
        display = {"github": "GitHub", "google-oauth2": "Gmail"}.get(
            provider, provider
        )
        connections.append(
            {
                "id": provider,
                "provider": display,
                "status": "connected",
                "scopes": _provider_scopes(provider),
                "connected_at": session.get("user", {}).get("updated_at", ""),
            }
        )

    return {"connections": connections}


@router.post("/{provider}/connect")
async def connect(provider: str):
    """Redirect to Auth0 Connected Accounts flow for a provider.

    This is the real Token Vault integration - Auth0 handles the OAuth
    flow with the provider and stores their tokens securely.
    """
    return RedirectResponse(f"/auth/connect/{provider}", status_code=307)


@router.delete("/{provider}")
async def disconnect(provider: str, request: Request):
    """Disconnect a Token Vault connection."""
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)
    if session:
        accounts = session.get("connected_accounts", [])
        if provider in accounts:
            accounts.remove(provider)
    return {"status": "disconnected", "provider": provider}


@router.get("/{provider}/token")
async def get_token(provider: str, request: Request):
    """Get a Token Vault token for agent use. Layer 1 of the double gate."""
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    connected = session.get("connected_accounts", [])
    if provider not in connected:
        raise HTTPException(
            status_code=400,
            detail=f"Provider '{provider}' not connected. Use Connected Accounts to connect it first.",
        )

    # Delegate to the Token Vault exchange endpoint
    from auth.auth0 import auth0_client

    refresh_token = session.get("refresh_token", "")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token available")

    try:
        token = await auth0_client.token_vault_exchange(refresh_token, provider)
        return {
            "provider": provider,
            "token": token,
            "token_type": "Bearer",
        }
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Token retrieval failed: {e}"
        )


def _provider_scopes(provider: str) -> list[str]:
    """Return display scopes for a provider."""
    return {
        "github": ["repo", "read:org"],
        "google-oauth2": ["gmail.readonly"],
    }.get(provider, [])
