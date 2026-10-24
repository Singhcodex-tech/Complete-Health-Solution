"""Branch-level price comparison tables (labs -> tests -> prices).

Separate from the older company-level `LabCompany` / `LabTest` tables, which
keep powering /lab-partners and orders.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
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
    # Admin-editable. NULL/"General" = uncategorised. Filled from keywords on creation.
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)


class TestAlias(Base):
    """Another spelling of a master test ("Complete Blood Count" -> CBC)."""

    __tablename__ = "test_aliases"
    __test__ = False

    alias_normalized: Mapped[str] = mapped_column(String(500), primary_key=True)
    alias: Mapped[str] = mapped_column(String(500), nullable=False)
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tests.id", ondelete="CASCADE"), nullable=False, index=True
    )


class PincodeGeo(Base):
    """Cached centre point of a pin code. lat/lon NULL = lookup failed (retry later)."""

    __tablename__ = "pincode_geo"

    pin_code: Mapped[str] = mapped_column(String(6), primary_key=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(20), default="geocoder")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)


class PriceUploadJob(Base):
    """One background upload run: preview, commit or undo. Doubles as the history log."""

    __tablename__ = "price_upload_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(10), nullable=False)  # preview | commit | undo
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="queued", index=True)
    # queued | running | done | failed | undone
    filename: Mapped[str] = mapped_column(String(255), default="")
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    options: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    report: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changes_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    target_job_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


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
