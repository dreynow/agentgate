from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth0
    auth0_domain: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_audience: str = ""

    # Kanoniv
    kanoniv_api_url: str = "https://auth.kanoniv.com"
    kanoniv_root_key_path: str = "~/.kanoniv/root.key"

    # App
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"

    # Production: serve frontend from FastAPI (set to path of built dist/)
    static_dir: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
