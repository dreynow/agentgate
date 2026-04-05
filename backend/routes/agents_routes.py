"""Agent execution routes - the core demo flow."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.support import SupportAgent
from agents.deploy import DeployAgent
from auth.gate import get_activity_log, get_stats

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentAction(BaseModel):
    action: str
    params: dict = {}
    delegation_token: str
    github_token: str = ""


@router.post("/{agent_name}/execute")
async def execute_action(agent_name: str, body: AgentAction):
    """Execute an agent action through the double gate.

    Any agent name works - the agent type is inferred from the action scope.
    """
    delegation_token = body.delegation_token
    github_token = body.github_token

    # Route to the right agent class based on the action
    if body.action.startswith("github.issues."):
        agent = SupportAgent(delegation_token, github_token)
        agent.name = agent_name  # Use the custom agent name
    elif body.action.startswith("github.releases."):
        agent = DeployAgent(delegation_token, github_token)
        agent.name = agent_name
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action scope: {body.action}")

    result = agent.execute(body.action, body.params)
    return result


@router.get("/activity")
async def activity(limit: int = 50):
    """Get the enforcement activity log."""
    return {"entries": get_activity_log(limit)}


@router.get("/stats")
async def stats():
    """Get enforcement statistics."""
    return get_stats()
