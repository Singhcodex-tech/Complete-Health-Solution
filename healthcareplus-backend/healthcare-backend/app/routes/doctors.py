from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.doctor import DoctorAdminCreate, DoctorAdminUpdate, DoctorOut, DoctorUpdate

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/", response_model=list[DoctorOut])
def list_doctors(
    speciality: str | None = Query(default=None),
    online_only: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[Doctor]:
    """Public endpoint — powers the /doctors page on the frontend."""
    query = db.query(Doctor)
    if speciality:
        query = query.filter(Doctor.speciality.ilike(f"%{speciality}%"))
    if online_only:
        query = query.filter(Doctor.is_online.is_(True))
    return query.all()


@router.get("/admin", response_model=list[DoctorOut])
def admin_list_doctors(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[Doctor]:
    """Admin — full roster, including offline profiles, for the admin panel."""
    return db.query(Doctor).all()


@router.post("/admin", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def admin_create_doctor(
    payload: DoctorAdminCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> Doctor:
    """Admin — add a new doctor. Creates the linked login account too."""
    existing = (
        db.query(User)
        .filter((User.email == payload.email) | (User.phone == payload.phone))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email or phone already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.DOCTOR,
    )
    db.add(user)
    db.flush()

    doctor = Doctor(
        user_id=user.id,
        speciality=payload.speciality,
        experience_years=payload.experience_years,
        languages=payload.languages,
        consultation_fee=payload.consultation_fee,
        is_online=payload.is_online,
        bio=payload.bio,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.put("/admin/{doctor_id}", response_model=DoctorOut)
def admin_update_doctor(
    doctor_id: str,
    payload: DoctorAdminUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> Doctor:
    """Admin — edit any doctor's profile (and, optionally, their account details)."""
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    data = payload.model_dump(exclude_unset=True)
    user_fields = {k: data.pop(k) for k in ("full_name", "email", "phone") if k in data}
    if user_fields:
        user = db.get(User, doctor.user_id)
        for field, value in user_fields.items():
            setattr(user, field, value)

    for field, value in data.items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/admin/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Admin — remove a doctor entirely (profile + login account)."""
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    user = db.get(User, doctor.user_id)
    db.delete(doctor)
    if user:
        db.delete(user)
    db.commit()


def _get_own_doctor_profile(db: Session, user: User) -> Doctor:
    profile = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return profile


@router.get("/me", response_model=DoctorOut)
def read_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR)),
) -> Doctor:
    return _get_own_doctor_profile(db, current_user)


@router.put("/me", response_model=DoctorOut)
def update_my_profile(
    payload: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR)),
) -> Doctor:
    profile = _get_own_doctor_profile(db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
