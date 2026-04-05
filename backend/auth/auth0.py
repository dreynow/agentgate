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
        self._mgmt_token: str | None = None

    def get_login_url(self, redirect_uri: str, state: str) -> str:
        """Generate Auth0 Universal Login URL."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email offline_access",
            "audience": self.audience,
            "prompt": "consent",
            "state": state,
        }
        return f"{self.base_url}/authorize?{urlencode(params)}"

    def get_connect_url(
        self, connection: str, redirect_uri: str, state: str, scopes: str = ""
    ) -> str:
        """Generate Auth0 Connected Accounts URL."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email offline_access",
            "audience": self.audience,
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

    async def _get_mgmt_token(self) -> str:
        """Get a Management API token via client credentials."""
        if self._mgmt_token:
            return self._mgmt_token
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "audience": self.audience,
                },
            )
            resp.raise_for_status()
            self._mgmt_token = resp.json()["access_token"]
            return self._mgmt_token

    async def token_vault_exchange(self, refresh_token: str, connection: str) -> str:
        """Exchange a user's refresh token for an external API token via Token Vault.

        Tries the Token Vault grant type first. If it fails, falls back to
        the Management API to get the identity provider's access token.
        """
        # Attempt 1: Token Vault exchange
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/oauth/token",
                data={
                    "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
                    "client_id": self.client_id,
                    "subject_token": refresh_token,
                    "subject_token_type": "urn:ietf:params:oauth:token-type:refresh_token",
                    "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
                    "connection": connection,
                },
                auth=(self.client_id, self.client_secret),
            )
            if resp.status_code == 200:
                print(f"[TOKEN VAULT] Exchange succeeded for {connection}")
                return resp.json()["access_token"]
            vault_error = resp.text
            print(f"[TOKEN VAULT] Exchange failed: {vault_error}")

        # Attempt 2: Management API - get the identity provider token directly
        return await self._get_identity_token(refresh_token, connection)

    async def _get_identity_token(self, refresh_token: str, connection: str) -> str:
        """Get the provider's access token via Auth0 Management API.

        When a user authenticates with a social provider, Auth0 stores their
        provider access token. We can retrieve it via the Management API.
        """
        # Map connection names to provider identifiers
        provider_map = {"github": "github", "google-oauth2": "google-oauth2"}
        provider = provider_map.get(connection, connection)

        # Get user ID from the refresh token by calling userinfo
        mgmt_token = await self._get_mgmt_token()

        async with httpx.AsyncClient() as client:
            # First, use the user's access token to get their user_id
            # We need to get user info from the access token in the session
            # Instead, search for users with this identity
            resp = await client.get(
                f"{self.base_url}/api/v2/users",
                headers={"Authorization": f"Bearer {mgmt_token}"},
                params={
                    "q": f'identities.provider:"{provider}"',
                    "search_engine": "v3",
                },
            )
            if resp.status_code != 200:
                raise Exception(f"Management API failed: {resp.text}")

            users = resp.json()
            if not users:
                raise Exception(f"No users found with {provider} identity")

            # Find the identity with the provider token
            for user in users:
                for identity in user.get("identities", []):
                    if identity.get("provider") == provider:
                        token = identity.get("access_token")
                        if token:
                            print(f"[MGMT API] Got {provider} token for {user.get('email')}")
                            return token

            raise Exception(f"No {provider} access token found in user identities")

    async def get_github_token_for_user(self, user_sub: str) -> str:
        """Get GitHub token for a specific user via Management API."""
        mgmt_token = await self._get_mgmt_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/api/v2/users/{user_sub}",
                headers={"Authorization": f"Bearer {mgmt_token}"},
            )
            if resp.status_code != 200:
                raise Exception(f"Management API user lookup failed: {resp.text}")

            user = resp.json()
            for identity in user.get("identities", []):
                if identity.get("provider") == "github":
                    token = identity.get("access_token")
                    if token:
                        return token

            raise Exception("No GitHub access token found for this user")


auth0_client = Auth0Client()

# In-memory user session store (maps session_id -> user data + tokens)
user_sessions: dict[str, dict] = {}
