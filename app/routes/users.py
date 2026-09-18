from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()
