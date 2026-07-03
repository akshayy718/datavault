"""
Application configuration.

Reads all settings from environment variables (see .env.example at the repo
root). No secrets are hardcoded here -- this file only defines *names*,
types, and defaults; actual values always come from the environment.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"  # development | staging | production
    app_base_url: str = "http://localhost:3000"
    recipient_app_base_url: str = "http://localhost:3001"

    # Database
    database_url: str = "sqlite:///./datavault_dev.db"

    # Auth
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expiry_minutes: int = 15
    jwt_refresh_token_expiry_days: int = 7

    # Google login -- the OAuth Client ID configured in Google Cloud Console
    # for this app. The frontend obtains an id_token via Google Sign-In and
    # sends it to POST /auth/google; we verify it was issued for THIS client
    # ID specifically, which is what prevents a token meant for some other
    # app being replayed against ours.
    google_oauth_client_id: str = ""

    # AI Provider (platform-managed key only for MVP -- per the PRD's
    # roadmap, BYOK/hybrid key switching is explicitly Phase 7, not MVP).
    # Groq's API is OpenAI-compatible, so we call it via plain HTTP rather
    # than adding a new SDK dependency.
    ai_provider_api_key: str = ""
    ai_provider_base_url: str = "https://api.groq.com/openai/v1"
    ai_provider_model: str = "llama-3.3-70b-versatile"


settings = Settings()
