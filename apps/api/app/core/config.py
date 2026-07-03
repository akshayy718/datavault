"""
Application configuration.

Reads all settings from environment variables (see .env.example at the repo
root). No secrets are hardcoded here -- this file only defines *names*,
types, and defaults; actual values always come from the environment.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# The .env file lives at the PROJECT ROOT (datavault/.env), but this app
# is always launched with apps/api as the working directory. A plain
# env_file=".env" resolves relative to the current working directory at
# runtime, NOT relative to this file's location -- so it was silently
# looking for apps/api/.env (which doesn't exist) and falling back to
# every setting's hardcoded default, with no error or warning, since
# pydantic-settings treats a missing .env file as "nothing to load,"
# not a failure. This kind of bug hides successfully for a long time
# precisely because most defaults happen to match what's actually wanted
# (e.g. the SQLite DATABASE_URL default) -- it only became visible once a
# setting (AI_PROVIDER_API_KEY) had an empty, clearly-wrong default.
# Resolving the path from THIS file's known location, rather than the
# working directory, makes it correct regardless of where the app is
# launched from.
_ENV_FILE_PATH = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE_PATH, extra="ignore")

    # App
    app_env: str = "development"  # development | staging | production
    app_base_url: str = "http://localhost:3000"
    recipient_app_base_url: str = "http://localhost:3001"

    # Database
    database_url: str = "sqlite:///./datavault_dev.db"

    # Auth
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expiry_minutes: int = 1440  # 24 hours — was 15min which caused mid-session logouts
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

    # BYOK key encryption (Module 14). A Fernet key, NOT the same thing
    # as JWT_SECRET -- this specifically encrypts/decrypts user-supplied
    # AI provider keys at rest. Must be a valid Fernet key (32 url-safe
    # base64-encoded bytes); generate one with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Left empty by default -- BYOK key storage fails with a clear,
    # actionable error if this isn't set, rather than silently using a
    # weak or predictable fallback.
    byok_encryption_key: str = ""


settings = Settings()
