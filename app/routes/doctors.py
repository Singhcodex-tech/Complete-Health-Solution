from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.doctor import DoctorOut, DoctorUpdate

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
