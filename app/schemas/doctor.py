from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class DoctorUpdate(BaseModel):
    speciality: str | None = None
    experience_years: int | None = None
    languages: str | None = None
    consultation_fee: float | None = None
    is_online: bool | None = None
    bio: str | None = None


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
