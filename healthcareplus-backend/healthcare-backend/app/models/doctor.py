import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    speciality: Mapped[str] = mapped_column(String(120), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    languages: Mapped[str] = mapped_column(String(255), default="English")
    consultation_fee: Mapped[float] = mapped_column(Float, default=0.0)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="doctor")
