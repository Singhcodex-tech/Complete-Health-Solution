import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, SessionLocal, engine
from app.routes import auth, bookings, doctors, labs, orders, patients, users
from app.seed import seed_lab_companies

# Import models so their tables are registered on Base.metadata before create_all.
import app.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.APP_NAME,
    description="REST API powering the HealthCare+ platform — auth, patients, "
    "doctors and bookings, with more modules added incrementally.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Creates tables if they don't exist yet. Fine for dev/SQLite; swap for
    # Alembic migrations before running this against production Postgres.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_lab_companies(db)
    finally:
        db.close()


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "healthy"}


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(patients.router, prefix=settings.API_V1_PREFIX)
app.include_router(doctors.router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings.router, prefix=settings.API_V1_PREFIX)
app.include_router(labs.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
