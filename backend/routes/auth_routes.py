"""Auth0 login/callback + Connected Accounts + Token Vault routes."""

import secrets
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from auth.auth0 import auth0_client, user_sessions
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory state store: state -> {"type": "login" | "connect", "connection": str}
_pending_states: dict[str, dict] = {}

# Connection scopes for each provider
CONNECTION_SCOPES = {
    "github": "repo read:org",
    "google-oauth2": "https://www.googleapis.com/auth/gmail.readonly",
}


@router.get("/login")
async def login():
    """Redirect to Auth0 Universal Login."""
    state = secrets.token_urlsafe(32)
    _pending_states[state] = {"type": "login"}
    redirect_uri = f"{settings.app_url}/auth/callback"
    url = auth0_client.get_login_url(redirect_uri, state)
    return RedirectResponse(url)


@router.get("/connect/{connection}")
async def connect_account(connection: str):
    """Start the Connected Accounts flow for a provider.

    This redirects to Auth0 which redirects to the provider (GitHub, Google, etc.)
    for authorization. Auth0 stores the provider's tokens in Token Vault.
    """
    state = secrets.token_urlsafe(32)
    _pending_states[state] = {"type": "connect", "connection": connection}
    redirect_uri = f"{settings.app_url}/auth/callback"
    scopes = CONNECTION_SCOPES.get(connection, "")
    url = auth0_client.get_connect_url(connection, redirect_uri, state, scopes)
    return RedirectResponse(url)


@router.get("/callback")
async def callback(code: str = "", state: str = "", error: str = ""):
    """Handle Auth0 callback after login or Connected Accounts flow.

    Exchanges the auth code for access + refresh tokens.
    The refresh_token is stored server-side for Token Vault exchanges.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"Auth0 error: {error}")

    pending = _pending_states.pop(state, None)
    if not pending:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    redirect_uri = f"{settings.app_url}/auth/callback"
    tokens = await auth0_client.exchange_code(code, redirect_uri)
    user_info = await auth0_client.get_user_info(tokens["access_token"])

    flow_type = pending.get("type", "login")
    connection = pending.get("connection", "")

    print(f"[AUTH] {flow_type} flow complete. User: {user_info.get('email', 'unknown')}")
    print(f"[AUTH] Tokens: access={'yes' if tokens.get('access_token') else 'no'}, refresh={'yes' if tokens.get('refresh_token') else 'NO!'}")

    # Create or update server-side session
    # Check if user already has a session (for connect flows)
    session_id = None
    for sid, sess in user_sessions.items():
        if sess.get("user", {}).get("sub") == user_info.get("sub"):
            session_id = sid
            # Update tokens (connect flow gives fresh tokens)
            sess["access_token"] = tokens["access_token"]
            if tokens.get("refresh_token"):
                sess["refresh_token"] = tokens["refresh_token"]
            if connection:
                sess.setdefault("connected_accounts", [])
                if connection not in sess["connected_accounts"]:
                    sess["connected_accounts"].append(connection)
            break

    if not session_id:
        session_id = secrets.token_urlsafe(32)
        user_sessions[session_id] = {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
            "user": user_info,
            "connected_accounts": [connection] if connection else [],
        }

    # Redirect to appropriate frontend page
    if flow_type == "connect":
        redirect_url = f"{settings.frontend_url}/connections?connected={connection}"
    else:
        redirect_url = f"{settings.frontend_url}/?logged_in=true"

    response = RedirectResponse(redirect_url)
    response.set_cookie(
        key="agentgate_session",
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=3600 * 24,
    )
    return response


@router.get("/me")
async def me(request: Request):
    """Get current user info from session."""
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "email": session["user"].get("email", ""),
        "name": session["user"].get("name", ""),
        "picture": session["user"].get("picture", ""),
        "logged_in": True,
        "has_refresh_token": bool(session.get("refresh_token")),
        "connected_accounts": session.get("connected_accounts", []),
    }


@router.get("/token-vault/{connection}")
async def get_vault_token(connection: str, request: Request):
    """Exchange the user's refresh token for an external API token via Token Vault.

    This is the key integration: Auth0 Token Vault returns the user's
    GitHub/Gmail/etc token that was stored when they connected that account.
    """
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated. Login first.")

    refresh_token = session.get("refresh_token", "")
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token. Re-login with offline_access scope.",
        )

    try:
        external_token = await auth0_client.token_vault_exchange(
            refresh_token, connection
        )
        return {"connection": connection, "token": external_token}
    except Exception as e:
        # Fallback: try direct user lookup via Management API
        user_sub = session.get("user", {}).get("sub", "")
        if user_sub and connection == "github":
            try:
                token = await auth0_client.get_github_token_for_user(user_sub)
                return {"connection": connection, "token": token}
            except Exception as e2:
                raise HTTPException(
                    status_code=400,
                    detail=f"Token Vault and Management API both failed: {e} | {e2}",
                )
        raise HTTPException(
            status_code=400,
            detail=f"Token Vault exchange failed: {e}",
        )


@router.get("/debug")
async def debug(request: Request):
    """Debug session state - shows what tokens we have."""
    session_id = request.cookies.get("agentgate_session", "")
    session = user_sessions.get(session_id)
    if not session:
        return {"error": "no session"}
    rt = session.get("refresh_token", "")
    return {
        "has_session": True,
        "has_refresh_token": bool(rt),
        "refresh_token_prefix": rt[:20] + "..." if rt else "",
        "connected_accounts": session.get("connected_accounts", []),
        "user_email": session.get("user", {}).get("email", ""),
    }


@router.get("/logout")
async def logout(request: Request):
    """Clear session."""
    session_id = request.cookies.get("agentgate_session", "")
    user_sessions.pop(session_id, None)
    response = RedirectResponse(settings.frontend_url)
    response.delete_cookie("agentgate_session")
    return response
