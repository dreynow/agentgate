"""Double Gate - verify Kanoniv delegation THEN retrieve Token Vault credentials."""

from datetime import datetime, timezone
from auth.kanoniv import verify_action, sign_action


# In-memory activity log (replace with DB in production)
activity_log: list[dict] = []


def double_gate(
    action: str,
    delegation_token: str,
    agent_name: str,
) -> dict:
    """The Double Gate pattern: verify authority, then allow credential access.

    Returns: {"allowed": bool, "reason": str, "verification": dict | None}
    """
    # Layer 1: Verify Kanoniv delegation
    result = verify_action(action, delegation_token)

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_name": agent_name,
        "action": action,
        "decision": "ALLOWED" if result.get("valid") else "BLOCKED",
        "reason": "Delegation verified" if result.get("valid") else f"Delegation invalid: {result}",
        "scopes": result.get("scopes", []),
        "ttl_remaining": result.get("ttl_remaining"),
    }
    activity_log.append(entry)

    if not result.get("valid"):
        return {
            "allowed": False,
            "reason": f"Kanoniv delegation check failed: {result}",
            "verification": result,
        }

    # Layer 2: Token Vault credentials would be retrieved here
    # (Only after Kanoniv says the agent is authorized)
    return {
        "allowed": True,
        "reason": "Authority verified - credentials released",
        "verification": result,
    }


def get_activity_log(limit: int = 50) -> list[dict]:
    """Get recent enforcement decisions."""
    return list(reversed(activity_log[-limit:]))


def get_stats() -> dict:
    """Get enforcement statistics."""
    allowed = sum(1 for e in activity_log if e["decision"] == "ALLOWED")
    blocked = sum(1 for e in activity_log if e["decision"] == "BLOCKED")
    return {
        "total": len(activity_log),
        "allowed": allowed,
        "blocked": blocked,
    }
