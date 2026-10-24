import os

os.environ["DATABASE_URL"] = "sqlite://"  # set before app imports

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.security import create_access_token, hash_password
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def _isolation(monkeypatch, tmp_path):
    """No real network, no sleeps, fresh rate-limit counters, temp upload dir."""
    from app.core.config import settings
    from app.core.ratelimit import reset_rate_limits
    from app.services import pincode_geo

    reset_rate_limits()
    monkeypatch.setattr(pincode_geo, "geocode_pin_remote", lambda pin: None)
    monkeypatch.setattr(pincode_geo.time, "sleep", lambda s: None)
    monkeypatch.setattr(settings, "PRICE_UPLOAD_DIR", str(tmp_path / "uploads"))
    yield
    reset_rate_limits()


@pytest.fixture()
def client(db, monkeypatch):
    from app.services.price_upload import jobs

    class _Factory:  # jobs open their own session; reuse the test one, don't close it
        def __call__(self):
            return _Keep(db)

    class _Keep:
        def __init__(self, s):
            self._s = s

        def __getattr__(self, k):
            return getattr(self._s, k)

        def close(self):
            pass

    monkeypatch.setattr(jobs, "session_factory", _Factory())
    jobs.PROGRESS.clear()
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _token(db, role: UserRole, email: str, phone: str) -> dict:
    user = User(full_name=role.value, email=email, phone=phone,
                hashed_password=hash_password("x"), role=role)
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.id, role.value)}"}


@pytest.fixture()
def admin_headers(db):
    return _token(db, UserRole.ADMIN, "a@x.com", "9000000001")


@pytest.fixture()
def patient_headers(db):
    return _token(db, UserRole.PATIENT, "p@x.com", "9000000002")


@pytest.fixture()
def patient_with_profile(db):
    from app.models.patient import Patient

    user = User(full_name="Pat", email="pat@x.com", phone="9000000003",
                hashed_password=hash_password("x"), role=UserRole.PATIENT)
    db.add(user)
    db.commit()
    db.add(Patient(user_id=user.id))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.id, UserRole.PATIENT.value)}"}
