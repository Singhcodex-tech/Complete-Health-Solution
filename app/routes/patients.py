from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.patient import PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["Patients"])


def _get_own_patient_profile(db: Session, user: User) -> Patient:
    profile = db.query(Patient).filter(Patient.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
    return profile


@router.get("/me", response_model=PatientOut)
def read_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> Patient:
    return _get_own_patient_profile(db, current_user)


@router.put("/me", response_model=PatientOut)
def update_my_profile(
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> Patient:
    profile = _get_own_patient_profile(db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[Patient]:
    return db.query(Patient).all()
