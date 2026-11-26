from datetime import timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.services.otp_service import generate_totp_secret, get_totp_uri, generate_qr_code_data_url, verify_totp_code

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def ensure_single_vault_owner(db: Session) -> User:
    """Ensure the single authorized vault owner is initialized in the database."""
    user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
    if not user:
        # Create the sole vault owner
        user = User(
            username=settings.ADMIN_USERNAME,
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            totp_secret=None,
            is_totp_enabled=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def authenticate_user_step1(db: Session, username: str, password: str):
    """
    Step 1: Authenticate username and password.
    Returns (user, temp_token) if successful.
    """
    # Guarantee vault owner exists
    ensure_single_vault_owner(db)

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Generate a temporary token valid for 5 minutes solely for 2FA completion
    temp_payload = {
        "sub": str(user.id),
        "username": user.username,
        "type": "2fa_pending"
    }
    temp_token = create_access_token(temp_payload, expires_delta=timedelta(minutes=5))
    return user, temp_token

def get_totp_setup_for_user(user: User):
    """Generate or retrieve TOTP secret and QR code for initial setup."""
    secret = user.totp_secret or generate_totp_secret()
    uri = get_totp_uri(user.username, secret)
    qr_code = generate_qr_code_data_url(uri)
    return secret, qr_code, uri

def enable_user_totp(db: Session, user: User, secret: str, code: str):
    """Verify code and permanently enable TOTP for this user."""
    if not verify_totp_code(secret, code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit authenticator code"
        )
    user.totp_secret = secret
    user.is_totp_enabled = True
    db.commit()
    db.refresh(user)
    return user

def verify_user_otp_step2(db: Session, temp_token: str, otp_code: str) -> tuple[User, str]:
    """
    Step 2: Validate temp 2FA token and 6-digit TOTP code.
    Returns (user, full_access_token).
    """
    payload = decode_token(temp_token)
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA session token"
        )

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_totp_enabled or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is not configured yet for this account"
        )

    if not verify_totp_code(user.totp_secret, otp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 6-digit authenticator code"
        )

    # Issue final JWT access token
    access_payload = {
        "sub": str(user.id),
        "username": user.username,
        "type": "access"
    }
    access_token = create_access_token(access_payload)
    return user, access_token

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency to retrieve the authenticated vault owner."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vault owner not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user
