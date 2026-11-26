from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.schemas.auth_schema import (
    LoginRequest, LoginResponse,
    OTPVerifyRequest, TokenResponse,
    OTPSetupResponse, OTPEnableRequest,
    UserResponse
)
from app.services.auth_service import (
    authenticate_user_step1,
    get_totp_setup_for_user,
    enable_user_totp,
    verify_user_otp_step2,
    get_current_user
)
from app.core.security import decode_token, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Step 1 of 2FA:
    Authenticate with username and password.
    Returns a temporary 2FA token required for step 2.
    """
    user, temp_token = authenticate_user_step1(db, request.username, request.password)
    return LoginResponse(
        requires_otp=True,
        is_totp_setup=bool(user.is_totp_enabled and user.totp_secret),
        temp_token=temp_token,
        message="Credentials verified. Authenticator 2FA verification required."
    )

@router.get("/setup-otp", response_model=OTPSetupResponse)
def setup_otp(temp_token: str = Query(...), db: Session = Depends(get_db)):
    """
    Generate TOTP secret and QR code for the authenticator app during initial setup.
    """
    payload = decode_token(temp_token)
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    secret, qr_code_url, uri = get_totp_setup_for_user(user)
    return OTPSetupResponse(
        secret=secret,
        qr_code_url=qr_code_url,
        provisioning_uri=uri
    )

@router.post("/enable-otp", response_model=TokenResponse)
def enable_otp(request: OTPEnableRequest, db: Session = Depends(get_db)):
    """
    Confirm OTP code during initial setup, persist secret to Supabase, and issue final JWT access token.
    """
    payload = decode_token(request.temp_token)
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = enable_user_totp(db, user, request.secret, request.otp_code)

    access_payload = {"sub": str(user.id), "username": user.username, "type": "access"}
    access_token = create_access_token(access_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2 of 2FA:
    Submit 6-digit TOTP code with temp_token to receive full access JWT.
    """
    user, access_token = verify_user_otp_step2(db, request.temp_token, request.otp_code)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated vault owner profile."""
    return UserResponse.model_validate(current_user)
