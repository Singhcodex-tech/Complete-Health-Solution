import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class LabCompany(Base):
    __tablename__ = "lab_companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    tagline: Mapped[str] = mapped_column(String(255), default="")
    established: Mapped[str] = mapped_column(String(10), default="")
    labs_count: Mapped[str] = mapped_column(String(80), default="")

    tests: Mapped[list["LabTest"]] = relationship(
        "LabTest", back_populates="company", cascade="all, delete-orphan"
    )


class LabTest(Base):
    __tablename__ = "lab_tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lab_companies.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    turnaround: Mapped[str] = mapped_column(String(40), default="24 hrs")

    company: Mapped["LabCompany"] = relationship("LabCompany", back_populates="tests")
