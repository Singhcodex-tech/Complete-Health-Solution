import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.order import OTPPurpose, OTPVerification
from app.services.sms import send_sms

logger = logging.getLogger("healthcareplus.otp")

OTP_LENGTH = 6
OTP_EXPIRE_MINUTES = 10
MAX_ATTEMPTS = 5

_PURPOSE_LABELS: dict[OTPPurpose, str] = {
    OTPPurpose.RIDER_LOGIN: "rider login",
    OTPPurpose.PICKUP: "sample pickup",
    OTPPurpose.LAB_DROPOFF: "lab drop-off",
}


def _generate_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


def create_and_send_otp(
    db: Session,
    *,
    purpose: OTPPurpose,
    to_phone: str,
    order_id: str | None = None,
    user_id: str | None = None,
    lab_company_id: str | None = None,
) -> OTPVerification:
    """Generate a fresh OTP, invalidate any older unverified OTP for the same
    purpose/order(/lab), store a bcrypt hash of it (never plaintext), and SMS it.
    """
    # Invalidate any still-pending OTP of the same purpose for the same order/user/lab.
    stale_query = db.query(OTPVerification).filter(
        OTPVerification.purpose == purpose,
        OTPVerification.verified_at.is_(None),
    )
    if order_id is not None:
        stale_query = stale_query.filter(OTPVerification.order_id == order_id)
    if user_id is not None:
        stale_query = stale_query.filter(OTPVerification.user_id == user_id)
    if lab_company_id is not None:
        stale_query = stale_query.filter(OTPVerification.lab_company_id == lab_company_id)
    for stale in stale_query.all():
        db.delete(stale)
    db.flush()

    code = _generate_code()
    record = OTPVerification(
        order_id=order_id,
        user_id=user_id,
        purpose=purpose,
        lab_company_id=lab_company_id,
        code_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    label = _PURPOSE_LABELS.get(purpose, purpose.value)
    message = (
        f"HealthCare+: Your OTP for {label} is {code}. "
        f"Valid for {OTP_EXPIRE_MINUTES} minutes. Do not share this code with anyone."
    )
    send_sms(to_phone, message)

    return record


class OTPError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def verify_otp(
    db: Session,
    *,
    purpose: OTPPurpose,
    code: str,
    order_id: str | None = None,
    user_id: str | None = None,
    lab_company_id: str | None = None,
) -> OTPVerification:
    """Verify a submitted code against the latest pending OTP for this
    purpose/order(/lab) (or user, for login OTPs). Raises OTPError on any failure.
    """
    query = db.query(OTPVerification).filter(
        OTPVerification.purpose == purpose,
        OTPVerification.verified_at.is_(None),
    )
    if order_id is not None:
        query = query.filter(OTPVerification.order_id == order_id)
    if user_id is not None:
        query = query.filter(OTPVerification.user_id == user_id)
    if lab_company_id is not None:
        query = query.filter(OTPVerification.lab_company_id == lab_company_id)

    record = query.order_by(OTPVerification.created_at.desc()).first()
    if record is None:
        raise OTPError("No pending OTP found. Please request a new one.")

    if record.attempts >= MAX_ATTEMPTS:
        raise OTPError("Too many incorrect attempts. Please request a new OTP.")

    now = datetime.now(timezone.utc)
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise OTPError("This OTP has expired. Please request a new one.")

    if not verify_password(code, record.code_hash):
        record.attempts += 1
        db.commit()
        raise OTPError("Incorrect OTP.")

    record.verified_at = now
    db.commit()
    db.refresh(record)
    return record
