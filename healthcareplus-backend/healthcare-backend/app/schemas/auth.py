from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole = UserRole.PATIENT


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str
    user_id: str


class LoginOTPPendingResponse(BaseModel):
    otp_required: bool = True
    user_id: str
    message: str = "OTP sent to your registered phone number."


class LoginOTPVerifyRequest(BaseModel):
    user_id: str
    code: str = Field(min_length=4, max_length=8)
