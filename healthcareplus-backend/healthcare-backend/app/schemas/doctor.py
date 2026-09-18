from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserOut


class DoctorUpdate(BaseModel):
    speciality: str | None = None
    experience_years: int | None = None
    languages: str | None = None
    consultation_fee: float | None = None
    is_online: bool | None = None
    bio: str | None = None


class DoctorAdminCreate(BaseModel):
    """Used by admins to add a new doctor — creates the linked user account too."""

    full_name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    speciality: str
    experience_years: int = 0
    languages: str = "English"
    consultation_fee: float = 0.0
    is_online: bool = False
    bio: str | None = None


class DoctorAdminUpdate(DoctorUpdate):
    """Same editable fields as DoctorUpdate, used on the admin endpoint."""

    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    speciality: str
    experience_years: int
    languages: str
    consultation_fee: float
    rating: float
    is_online: bool
    bio: str | None
    user: UserOut
