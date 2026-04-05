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
_static_dir = settings.static_dir or os.environ.get("STATIC_DIR", "")
if _static_dir and os.path.isdir(_static_dir):
    print(f"[STATIC] Serving frontend from {_static_dir}")
    _index_html = os.path.join(_static_dir, "index.html")

    # Mount /assets for JS/CSS bundles
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    # SPA catch-all: serve index.html for any non-API path
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Try to serve an actual file first (e.g. favicon.ico)
        file_path = os.path.join(_static_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html for client-side routing
        return FileResponse(_index_html)
else:
    print(f"[STATIC] No static dir found (STATIC_DIR={_static_dir!r})")
