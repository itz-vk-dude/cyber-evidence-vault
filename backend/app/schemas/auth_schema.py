from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    requires_otp: bool = True
    is_totp_setup: bool = True
    temp_token: str
    email_masked: str
    message: str

class ResendOTPRequest(BaseModel):
    temp_token: str

class OTPVerifyRequest(BaseModel):
    temp_token: str
    otp_code: str

class OTPSetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    provisioning_uri: str

class OTPEnableRequest(BaseModel):
    temp_token: str
    secret: str
    otp_code: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_totp_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
