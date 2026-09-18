import enum
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class OrderStatus(str, enum.Enum):
    PENDING = "pending"  # created, waiting for admin to assign a rider
    ASSIGNED = "assigned"  # rider assigned, en route to pickup
    PICKED_UP = "picked_up"  # pickup OTP verified, sample(s) with rider
    AT_LAB = "at_lab"  # dropped off at every lab in this order, awaiting report
    COMPLETED = "completed"  # admin marked report delivered (e.g. sent on WhatsApp)
    CANCELLED = "cancelled"


class OTPPurpose(str, enum.Enum):
    RIDER_LOGIN = "rider_login"  # 2FA at rider sign-in, tied to a user not an order
    PICKUP = "pickup"  # patient hands sample(s) to rider — once per order
    LAB_DROPOFF = "lab_dropoff"  # rider hands sample to a specific lab — once per lab in the order


# Which OTP purpose is required to move an order from one status to the next.
# LAB_DROPOFF doesn't map to a single next status since an order can touch
# several labs — see verify_order_otp, which only advances to AT_LAB once
# every OrderLabDropoff row for the order is verified.
NEXT_STATUS_FOR_PURPOSE: dict[OTPPurpose, OrderStatus] = {
    OTPPurpose.PICKUP: OrderStatus.PICKED_UP,
}


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    rider_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_date: Mapped[date] = mapped_column(Date, nullable=False)
    pickup_time: Mapped[time] = mapped_column(Time, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    at_lab_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient")
    rider: Mapped["User"] = relationship("User")
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    lab_dropoffs: Mapped[list["OrderLabDropoff"]] = relationship(
        "OrderLabDropoff", back_populates="order", cascade="all, delete-orphan"
    )
    otp_verifications: Mapped[list["OTPVerification"]] = relationship(
        "OTPVerification", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    """Snapshot of a test at the time it was ordered — price changes on the
    catalog later shouldn't change what an existing order billed for. Also
    snapshots which lab the test belongs to, since one order can now span
    several labs and each item may come from a different one."""

    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    lab_test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lab_tests.id", ondelete="RESTRICT"), nullable=False
    )
    lab_company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lab_companies.id", ondelete="RESTRICT"), nullable=False
    )
    lab_company_name: Mapped[str] = mapped_column(String(120), nullable=False)
    test_name: Mapped[str] = mapped_column(String(150), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")


class OrderLabDropoff(Base):
    """One row per distinct lab company touched by an order. The rider
    verifies a LAB_DROPOFF OTP against each of these individually; once every
    row for an order is verified, the order as a whole moves to AT_LAB."""

    __tablename__ = "order_lab_dropoffs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    lab_company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lab_companies.id", ondelete="RESTRICT"), nullable=False
    )
    lab_company_name: Mapped[str] = mapped_column(String(120), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="lab_dropoffs")


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    purpose: Mapped[OTPPurpose] = mapped_column(Enum(OTPPurpose), nullable=False)
    # Only set for LAB_DROPOFF — identifies which of the order's labs this
    # particular code is confirming drop-off at.
    lab_company_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("lab_companies.id", ondelete="CASCADE"), nullable=True
    )

    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    order: Mapped["Order"] = relationship("Order", back_populates="otp_verifications")
