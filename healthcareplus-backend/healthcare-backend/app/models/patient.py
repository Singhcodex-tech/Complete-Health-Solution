import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", back_populates="patient", cascade="all, delete-orphan"
    )
