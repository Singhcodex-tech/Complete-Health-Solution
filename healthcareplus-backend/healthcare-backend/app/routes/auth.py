from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.order import OTPPurpose
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginOTPPendingResponse,
    LoginOTPVerifyRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services.otp import OTPError, create_and_send_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(
        (User.email == payload.email) | (User.phone == payload.phone)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email or phone already exists",
        )

    # Rider and admin accounts are provisioned by an admin, not self-registered.
    if payload.role in (UserRole.RIDER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This role cannot self-register. Contact an admin.",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()  # populate user.id before creating the profile row

    # Auto-create the matching profile row so /patients/me or /doctors/me
    # works immediately after registration.
    if payload.role == UserRole.PATIENT:
        db.add(Patient(user_id=user.id))
    elif payload.role == UserRole.DOCTOR:
        db.add(Doctor(user_id=user.id, speciality="General Physician"))

    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token, role=user.role, full_name=user.full_name, user_id=user.id
    )


@router.post("/login", response_model=TokenResponse | LoginOTPPendingResponse)
def login(
    payload: LoginRequest, db: Session = Depends(get_db)
) -> TokenResponse | LoginOTPPendingResponse:
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated"
        )

    # Riders get a second factor: password alone issues no token yet — an
    # OTP is texted to their phone and must be verified via /auth/verify-login-otp.
    if user.role == UserRole.RIDER:
        create_and_send_otp(
            db, purpose=OTPPurpose.RIDER_LOGIN, to_phone=user.phone, user_id=user.id
        )
        return LoginOTPPendingResponse(user_id=user.id)

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token, role=user.role, full_name=user.full_name, user_id=user.id
    )


@router.post("/verify-login-otp", response_model=TokenResponse)
def verify_login_otp(
    payload: LoginOTPVerifyRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    """Second step of rider login: submit the OTP texted after /auth/login."""
    user = db.get(User, payload.user_id)
    if user is None or user.role != UserRole.RIDER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

    try:
        verify_otp(db, purpose=OTPPurpose.RIDER_LOGIN, code=payload.code, user_id=user.id)
    except OTPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token, role=user.role, full_name=user.full_name, user_id=user.id
    )


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
