from datetime import timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.connection import get_db
from app.database.models import User
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.services.otp_service import generate_totp_secret, get_totp_uri, generate_qr_code_data_url, verify_totp_code
from app.services.email_service import generate_email_otp, verify_email_otp, mask_email

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def ensure_single_vault_owner(db: Session) -> User:
    """Ensure default admin account exists."""
    user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
    if not user:
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
    elif user.email != settings.ADMIN_EMAIL:
        # Sync email from settings if updated
        user.email = settings.ADMIN_EMAIL
        db.commit()
        db.refresh(user)
    return user

def register_user(db: Session, username: str, email: str, password: str) -> tuple[User, str]:
    """
    Register a new vault user and issue email OTP verification code.
    Returns (user, temp_token).
    """
    clean_username = username.strip().lower()
    clean_email = email.strip().lower()

    if len(clean_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # Check if username exists
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered. Please choose another."
        )

    # Check if email exists
    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered. Please log in instead."
        )

    # Create new user
    new_user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hash_password(password),
        totp_secret=None,
        is_totp_enabled=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch email OTP
    generate_email_otp(new_user.id, new_user.email)

    # Issue temporary 2FA token
    temp_payload = {
        "sub": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "type": "2fa_pending"
    }
    temp_token = create_access_token(temp_payload, expires_delta=timedelta(minutes=15))
    return new_user, temp_token

def authenticate_user_step1(db: Session, username_or_email: str, password: str) -> tuple[User, str]:
    """
    Step 1: Authenticate with username or email + password.
    Dispatches 6-digit email OTP and returns (user, temp_token).
    """
    identifier = username_or_email.strip().lower()

    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    # Dispatch email OTP
    generate_email_otp(user.id, user.email)

    temp_payload = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "type": "2fa_pending"
    }
    temp_token = create_access_token(temp_payload, expires_delta=timedelta(minutes=15))
    return user, temp_token

def resend_email_otp_for_session(db: Session, temp_token: str) -> tuple[User, str]:
    """Resend a fresh email OTP code for an active 2FA pending session."""
    payload = decode_token(temp_token)
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again."
        )

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    code = generate_email_otp(user.id, user.email)
    return user, code

def verify_user_otp_step2(db: Session, temp_token: str, otp_code: str) -> tuple[User, str]:
    """
    Step 2: Validate temp 2FA token and 6-digit OTP code (Email OTP or TOTP Authenticator fallback).
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

    # 1. Try Email OTP verification
    is_valid, error_msg = verify_email_otp(user.id, otp_code)

    # 2. If email OTP failed, check TOTP Authenticator as fallback if configured
    if not is_valid and user.totp_secret and verify_totp_code(user.totp_secret, otp_code):
        is_valid = True
        error_msg = ""

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg or "Invalid 6-digit verification code"
        )

    # Issue final JWT access token
    access_payload = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "type": "access"
    }
    access_token = create_access_token(access_payload)
    return user, access_token

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
            detail="Vault user not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user
