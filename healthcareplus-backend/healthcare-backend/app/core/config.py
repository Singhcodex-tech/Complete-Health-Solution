from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "HealthCare+ API"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Database — defaults to local SQLite file so the app runs with zero setup.
    # Override with a Postgres URL in production, e.g.:
    # postgresql+psycopg2://user:password@host:5432/dbname
    DATABASE_URL: str = "sqlite:///./healthcareplus.db"

    # Auth
    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS — frontend origins allowed to call this API
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ]

    # File uploads (Cloudinary-compatible — plug real keys in later)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Payments (Stripe architecture — plug real keys in later)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # SMS notifications (Twilio) — if left blank, SMS sending falls back to
    # logging the message to the console instead of failing, so the app
    # still runs fully without a Twilio account.
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""


settings = Settings()
