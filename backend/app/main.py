from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure Digital Evidence Storage Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to Cyber Evidence Vault",
        "status": "Backend running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "Cyber Evidence Vault"
    }
