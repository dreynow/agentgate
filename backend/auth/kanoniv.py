"""Kanoniv Agent Auth - delegation and verification layer."""

from kanoniv_auth import delegate, verify, sign, init_root, load_root
from config import settings


def ensure_root_key():
    """Initialize root key if it doesn't exist."""
    import os
    path = os.path.expanduser(settings.kanoniv_root_key_path)
    if not os.path.exists(path):
        init_root(path)
    load_root(path)


def create_delegation(
    agent_name: str,
    scopes: list[str],
    ttl: str = "2h",
) -> str:
    """Create a Kanoniv delegation token for an agent."""
    return delegate(scopes=scopes, ttl=ttl, name=agent_name)


def verify_action(action: str, token: str) -> dict:
    """Verify an agent's delegation token for a specific action.

    Returns dict with: valid, agent_did, root_did, scopes, expires_at, ttl_remaining, chain_depth
    """
    return verify(action=action, token=token)


def sign_action(action: str, token: str, target: str = "", result: str = "success", metadata: dict | None = None) -> str:
    """Sign an execution envelope for audit trail."""
    return sign(
        action=action,
        token=token,
        target=target,
        result=result,
        metadata=metadata or {},
    )
