"""AgentGate - Two-Layer Authorization for AI Agents.

Auth0 Token Vault secures the credentials.
Kanoniv Agent Auth secures the authority.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
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
    _index_html = os.path.join(_static_dir, "index.html")
    print(f"[STATIC] Serving frontend from {_static_dir}")

    # Mount /assets for JS/CSS bundles
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    # SPA fallback: any 404 on a non-API path serves index.html
    @app.exception_handler(StarletteHTTPException)
    async def spa_fallback(request, exc):
        if exc.status_code == 404:
            path = request.url.path
            # Don't intercept API or auth 404s
            if path.startswith(("/api/", "/auth/", "/health")):
                return JSONResponse(
                    {"detail": exc.detail or "Not found"}, status_code=404
                )
            # Try serving a static file first
            file_path = os.path.join(_static_dir, path.lstrip("/"))
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            # SPA client-side route - serve index.html
            return FileResponse(_index_html)
        # Re-raise non-404 HTTP exceptions as JSON
        return JSONResponse(
            {"detail": exc.detail or "Error"}, status_code=exc.status_code
        )
else:
    print(f"[STATIC] No static dir found (STATIC_DIR={_static_dir!r})")
