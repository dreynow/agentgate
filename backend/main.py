"""AgentGate - Two-Layer Authorization for AI Agents.

Auth0 Token Vault secures the credentials.
Kanoniv Agent Auth secures the authority.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings
from routes.auth_routes import router as auth_router
from routes.connections import router as connections_router
from routes.delegations import router as delegations_router
from routes.agents_routes import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Kanoniv root key on startup
    from auth.kanoniv import ensure_root_key
    ensure_root_key()
    yield


app = FastAPI(
    title="AgentGate",
    description="Two-Layer Authorization for AI Agents",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS - allow frontend dev server + production same-origin
origins = [settings.frontend_url, "http://localhost:5173", "http://localhost:5174"]
if settings.app_url not in origins:
    origins.append(settings.app_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(delegations_router)
app.include_router(agents_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agentgate"}


# Production: serve frontend static files from FastAPI
static_dir = settings.static_dir or os.environ.get("STATIC_DIR", "")
if static_dir and os.path.isdir(static_dir):
    # Mount static assets (JS, CSS, images)
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Catch-all: serve index.html for SPA routes
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't intercept API routes
        if full_path.startswith(("auth/", "connections", "delegations", "agents/", "health")):
            return None
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
