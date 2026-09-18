from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.order import RiderCreate, RiderOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/riders", response_model=list[RiderOut])
def list_riders(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[User]:
    return db.query(User).filter(User.role == UserRole.RIDER).order_by(User.full_name).all()


@router.post("/riders", response_model=RiderOut, status_code=status.HTTP_201_CREATED)
def create_rider(
    payload: RiderCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    existing = db.query(User).filter(
        (User.email == payload.email) | (User.phone == payload.phone)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email or phone already exists",
        )

    rider = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.RIDER,
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


@router.patch("/riders/{rider_id}/deactivate", response_model=RiderOut)
def deactivate_rider(
    rider_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    rider = db.get(User, rider_id)
    if rider is None or rider.role != UserRole.RIDER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")
    rider.is_active = False
    db.commit()
    db.refresh(rider)
    return rider
