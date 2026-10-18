"""Branch-level price comparison tables (labs -> tests -> prices).

Separate from the older company-level `LabCompany` / `LabTest` tables, which
keep powering /lab-partners and orders.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Lab(Base):
    """One lab BRANCH: same name + different pin code = different row."""

    __tablename__ = "labs"
    __table_args__ = (
        UniqueConstraint("normalized_name", "pin_code", name="uq_labs_name_pin"),
        Index("ix_labs_pin_code", "pin_code"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(150), nullable=False)
    # STRING on purpose — never a number (leading zeros, no arithmetic).
    pin_code: Mapped[str] = mapped_column(String(6), nullable=False)


class Test(Base):
    """Master list of diagnostic tests."""

    __tablename__ = "tests"
    __test__ = False  # not a pytest class

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_name: Mapped[str] = mapped_column(
        String(500), unique=True, index=True, nullable=False
    )


class LabTestPrice(Base):
    __tablename__ = "lab_test_prices"
    __table_args__ = (
        Index("ix_ltp_test_id", "test_id"),
        CheckConstraint("price > 0", name="ck_ltp_price_positive"),
    )

    lab_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("labs.id", ondelete="CASCADE"), primary_key=True
    )
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tests.id", ondelete="CASCADE"), primary_key=True
    )
    price: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
