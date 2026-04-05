"""Kanoniv delegation management routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from auth.kanoniv import create_delegation, verify_action

router = APIRouter(prefix="/api/delegations", tags=["delegations"])

# In-memory delegation store
_delegations: list[dict] = []


class DelegationCreate(BaseModel):
    agent_name: str
    scopes: list[str]
    ttl: str = "2h"


class DelegationVerify(BaseModel):
    action: str
    token: str


@router.get("")
async def list_delegations():
    """List all active delegations."""
    return {"delegations": _delegations}


@router.post("")
async def create(body: DelegationCreate):
    """Create a new delegation for an agent."""
    try:
        token = create_delegation(
            agent_name=body.agent_name,
            scopes=body.scopes,
            ttl=body.ttl,
        )
        delegation = {
            "id": f"del_{len(_delegations) + 1}",
            "agent_name": body.agent_name,
            "scopes": body.scopes,
            "ttl": body.ttl,
            "token": token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
        }
        _delegations.append(delegation)
        return delegation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify")
async def verify(body: DelegationVerify):
    """Verify a delegation token for an action."""
    result = verify_action(body.action, body.token)
    return result


@router.delete("/{delegation_id}")
async def revoke(delegation_id: str):
    """Revoke a delegation."""
    for d in _delegations:
        if d["id"] == delegation_id:
            d["status"] = "revoked"
            d["revoked_at"] = datetime.now(timezone.utc).isoformat()
            return d
    raise HTTPException(status_code=404, detail="Delegation not found")
