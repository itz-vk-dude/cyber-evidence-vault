from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Cyber Evidence Vault"
    APP_ENV: str = "development"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@db.projectref.supabase.co:5432/postgres"
    JWT_SECRET_KEY: str = "default_jwt_secret_change_in_env_32_bytes_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ENCRYPTION_KEY: str = "REPLACE_WITH_BASE64_KEY"
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "ChangeMe123!"
    FRONTEND_URL: str = "http://localhost:5173"

    # Brevo (Sendinblue) API Configuration - Sends to ANY email/Gmail
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "vasanthakumar17032005@gmail.com"
    BREVO_SENDER_NAME: str = "Cyber Evidence Vault"

    # Resend API Configuration
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Cyber Evidence Vault <onboarding@resend.dev>"

    # Email / SMTP Configuration (Fallback)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "vault-security@example.com"
    SMTP_TLS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
