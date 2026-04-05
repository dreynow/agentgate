"""Base agent class with double-gate enforcement."""

from auth.gate import double_gate, activity_log
from auth.kanoniv import sign_action
from datetime import datetime, timezone


class Agent:
    """Base class for agents that go through the double gate."""

    def __init__(self, name: str, delegation_token: str):
        self.name = name
        self.delegation_token = delegation_token

    def execute(self, action: str, params: dict | None = None) -> dict:
        """Execute an action through the double gate."""
        # Gate check
        gate_result = double_gate(
            action=action,
            delegation_token=self.delegation_token,
            agent_name=self.name,
        )

        if not gate_result["allowed"]:
            return {
                "success": False,
                "action": action,
                "agent": self.name,
                "error": gate_result["reason"],
                "decision": "BLOCKED",
            }

        # Execute the actual action
        try:
            result = self._run(action, params or {})
            # Sign the execution for audit
            sign_action(
                action=action,
                token=self.delegation_token,
                target=result.get("target", ""),
                result="success",
                metadata={"agent": self.name, "params": params},
            )
            return {
                "success": True,
                "action": action,
                "agent": self.name,
                "result": result,
                "decision": "ALLOWED",
            }
        except Exception as e:
            # Log failure
            activity_log.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent_name": self.name,
                "action": action,
                "decision": "ERROR",
                "reason": str(e),
                "scopes": [],
                "ttl_remaining": None,
            })
            return {
                "success": False,
                "action": action,
                "agent": self.name,
                "error": str(e),
                "decision": "ERROR",
            }

    def _run(self, action: str, params: dict) -> dict:
        """Override in subclasses to implement actual logic."""
        raise NotImplementedError
