# HealthCare+ API — Backend Skeleton (Step 1)

FastAPI backend for the HealthCare+ platform. This is the **first module**
of the full build: auth, users, patients, doctors, and a universal booking
system. Ambulance, medicine delivery, lab tests, nursing, home care and
insurance modules will be added on top of this in later steps.

## Tech Stack

- **FastAPI** + **Uvicorn**
- **SQLAlchemy 2.0** (ORM) — SQLite for local dev, PostgreSQL for production
- **JWT auth** (python-jose) + **bcrypt** password hashing (passlib)
- **Pydantic v2** for request/response validation
- **Docker** + **docker-compose** (API + Postgres)

## Local Setup (SQLite, zero config)

```bash
python3 -m venv venv
# Windows:  venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # defaults already work out of the box

uvicorn app.main:app --reload
```

API docs (Swagger UI): **http://localhost:8000/docs**
Alternative docs (ReDoc): **http://localhost:8000/redoc**

A local `healthcareplus.db` SQLite file is created automatically on first
run — no database setup needed for development.

## Docker (API + PostgreSQL)

```bash
docker-compose up --build
```

This runs Postgres in one container and the API in another, wired together
automatically. The API will be at **http://localhost:8000**.

## Authentication Flow

1. `POST /api/v1/auth/register` — creates a `User` + matching `Patient` or
   `Doctor` profile row, returns a JWT.
2. `POST /api/v1/auth/login` — returns a JWT for existing users.
3. Send the JWT as `Authorization: Bearer <token>` on subsequent requests.
4. `GET /api/v1/auth/me` — returns the current user from the token.

Roles: `admin`, `doctor`, `patient`, `nurse`. Endpoints use
`require_roles(...)` to restrict access — e.g. only patients can create
bookings, only admin/doctor/nurse can view all bookings.

## Endpoints (Step 1)

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register + auto-create profile |
| POST | `/api/v1/auth/login` | Public | Login, get JWT |
| GET | `/api/v1/auth/me` | Authenticated | Current user |
| GET | `/api/v1/users/` | Admin | List all users |
| GET | `/api/v1/patients/me` | Patient | Own patient profile |
| PUT | `/api/v1/patients/me` | Patient | Update own profile |
| GET | `/api/v1/patients/` | Admin | List all patients |
| GET | `/api/v1/doctors/` | Public | List/search doctors |
| GET | `/api/v1/doctors/me` | Doctor | Own doctor profile |
| PUT | `/api/v1/doctors/me` | Doctor | Update own profile |
| POST | `/api/v1/bookings/` | Patient | Create a booking |
| GET | `/api/v1/bookings/me` | Patient | Own bookings |
| GET | `/api/v1/bookings/` | Admin/Doctor/Nurse | All bookings |
| PATCH | `/api/v1/bookings/{id}/status` | Admin/Doctor/Nurse | Update booking status |

## Project Structure

```
app/
  main.py              FastAPI app, CORS, router registration, startup
  database.py          SQLAlchemy engine/session, Base class
  core/
    config.py          Settings (env-driven)
    security.py         Password hashing + JWT create/verify
  models/               SQLAlchemy ORM models (User, Patient, Doctor, Booking)
  schemas/              Pydantic request/response schemas
  routes/               API route modules (auth, users, patients, doctors, bookings)
  auth/
    dependencies.py     get_current_user, require_roles(...) guards
```

## What's Next

- **Step 2** — Next.js frontend skeleton wired to this API, including a real
  login page hitting `/api/v1/auth/login`.
- **Step 3** — Booking system UI + doctor consultation module connected end-to-end.
- **Step 4** — Remaining service modules (ambulance, medicine delivery, lab
  tests, nursing, home care, insurance), each as its own router + models.
- **Step 5** — Admin / Doctor / Patient dashboards.
- **Step 6** — SEO, dark mode, animations, deployment polish.

## Switching to PostgreSQL

Set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/healthcareplus
```

No code changes needed — SQLAlchemy handles both dialects transparently.
For production, replace the `create_all()` startup call with proper Alembic
migrations before your schema stabilizes.
