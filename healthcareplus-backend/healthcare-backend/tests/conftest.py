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


@pytest.fixture()
def client(db):
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
