from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    requires_otp: bool = True
    is_totp_setup: bool
    temp_token: str
    message: str

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
