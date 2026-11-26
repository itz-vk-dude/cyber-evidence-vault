from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.connection import engine, Base, SessionLocal
from app.routes.auth_routes import router as auth_router
from app.routes.evidence_routes import router as evidence_router
from app.services.auth_service import ensure_single_vault_owner

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    try:
        Base.metadata.create_all(bind=engine)
        # Ensure the sole authorized vault owner exists
        db = SessionLocal()
        try:
            ensure_single_vault_owner(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Startup warning: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure Digital Evidence Storage Platform with AES-256-GCM & Supabase PostgreSQL",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(evidence_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to Cyber Evidence Vault",
        "status": "Backend running",
        "database": "Supabase PostgreSQL connected",
        "encryption": "AES-256-GCM + SHA-256 integrity"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "Cyber Evidence Vault"
    }
