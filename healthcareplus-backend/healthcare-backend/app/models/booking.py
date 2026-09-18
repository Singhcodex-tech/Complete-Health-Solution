import enum
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    doctor_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True
    )

    service_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="bookings")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="bookings")
