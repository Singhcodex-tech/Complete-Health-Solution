import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"
    NURSE = "nurse"
    RIDER = "rider"


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    patient_profile: Mapped["Patient"] = relationship(
        "Patient", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    doctor_profile: Mapped["Doctor"] = relationship(
        "Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
