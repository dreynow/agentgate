"""AgentGate - Two-Layer Authorization for AI Agents.

Auth0 Token Vault secures the credentials.
Kanoniv Agent Auth secures the authority.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
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
    from auth.kanoniv import ensure_root_key
    ensure_root_key()
    yield


app = FastAPI(
    title="AgentGate",
    description="Two-Layer Authorization for AI Agents",
    version="0.1.0",
    lifespan=lifespan,
)

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

# API routes (all under /api or /auth)
app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(delegations_router)
app.include_router(agents_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agentgate", "version": "0.1.2"}


# Production: serve frontend
_static_dir = settings.static_dir or os.environ.get("STATIC_DIR", "")
if _static_dir and os.path.isdir(_static_dir):
    _index_html = os.path.join(_static_dir, "index.html")
    print(f"[STATIC] Serving frontend from {_static_dir}")

    # Explicit SPA page routes - serve index.html for each frontend route
    @app.get("/")
    @app.get("/connections")
    @app.get("/delegations")
    @app.get("/agents")
    @app.get("/activity")
    async def spa_pages():
        return FileResponse(_index_html)

    # Mount /assets for JS/CSS bundles (checked after routes)
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    # Serve other static files (favicon, etc.)
    @app.get("/{file_path:path}")
    async def static_fallback(file_path: str):
        full = os.path.join(_static_dir, file_path)
        if os.path.isfile(full):
            return FileResponse(full)
        return FileResponse(_index_html)
else:
    print(f"[STATIC] No static dir found (STATIC_DIR={_static_dir!r})")
