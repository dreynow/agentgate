"""Auth0 integration - Universal Login + Token Vault + Connected Accounts."""

import httpx
from urllib.parse import urlencode
from config import settings


class Auth0Client:
    """Handles Auth0 Universal Login, Connected Accounts, and Token Vault."""

    def __init__(self):
        self.domain = settings.auth0_domain
        self.client_id = settings.auth0_client_id
        self.client_secret = settings.auth0_client_secret
        self.audience = settings.auth0_audience
        self.base_url = f"https://{self.domain}"

    def get_login_url(self, redirect_uri: str, state: str) -> str:
        """Generate Auth0 Universal Login URL.

        Requests offline_access to get a refresh_token, which Token Vault
        needs to exchange for external API tokens.
        """
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email offline_access",
            "prompt": "consent",
            "state": state,
        }
        return f"{self.base_url}/authorize?{urlencode(params)}"

    def get_connect_url(
        self, connection: str, redirect_uri: str, state: str, scopes: str = ""
    ) -> str:
        """Generate Auth0 Connected Accounts URL.

        This triggers the Connected Accounts flow where the user authorizes
        a third-party provider (GitHub, Gmail, etc.) and Auth0 stores the
        tokens in Token Vault.
        """
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email offline_access",
            "connection": connection,
            "prompt": "consent",
            "access_type": "offline",
            "state": state,
        }
        if scopes:
            params["connection_scope"] = scopes
        return f"{self.base_url}/authorize?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for tokens (access + refresh)."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_user_info(self, access_token: str) -> dict:
        """Get user profile from Auth0."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def token_vault_exchange(self, refresh_token: str, connection: str) -> str:
        """Exchange a user's refresh token for an external API token via Token Vault.

        Flow:
        1. User logged in via Auth0 and connected their GitHub account
        2. Auth0 stored their GitHub tokens in Token Vault
        3. We exchange our refresh_token for that stored GitHub token

        Returns the external API access token (e.g. GitHub token).
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/oauth/token",
                data={
                    "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
                    "subject_token": refresh_token,
                    "subject_token_type": "urn:ietf:params:oauth:token-type:refresh_token",
                    "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
                    "connection": connection,
                },
                auth=(self.client_id, self.client_secret),
            )
            if resp.status_code != 200:
                error_body = resp.text
                raise Exception(
                    f"Token Vault exchange failed ({resp.status_code}): {error_body}"
                )
            data = resp.json()
            return data["access_token"]


auth0_client = Auth0Client()

# In-memory user session store (maps session_id -> user data + tokens)
user_sessions: dict[str, dict] = {}
