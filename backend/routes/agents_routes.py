"""Agent execution routes - the core demo flow."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.support import SupportAgent
from agents.deploy import DeployAgent
from auth.gate import get_activity_log, get_stats

router = APIRouter(prefix="/agents", tags=["agents"])

# Registered agents and their tokens
_agent_tokens: dict[str, dict] = {}


class AgentAction(BaseModel):
    action: str
    params: dict = {}
    delegation_token: str
    github_token: str = ""


class RegisterAgent(BaseModel):
    name: str
    delegation_token: str
    github_token: str = ""


@router.post("/register")
async def register_agent(body: RegisterAgent):
    """Register an agent with its delegation token."""
    _agent_tokens[body.name] = {
        "delegation_token": body.delegation_token,
        "github_token": body.github_token,
    }
    return {"status": "registered", "agent": body.name}


@router.post("/{agent_name}/execute")
async def execute_action(agent_name: str, body: AgentAction):
    """Execute an agent action through the double gate."""
    delegation_token = body.delegation_token
    github_token = body.github_token

    if agent_name == "support-agent":
        agent = SupportAgent(delegation_token, github_token)
    elif agent_name == "deploy-agent":
        agent = DeployAgent(delegation_token, github_token)
    else:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_name}")

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
