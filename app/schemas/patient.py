from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class PatientUpdate(BaseModel):
    age: int | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    blood_group: str | None = None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    age: int | None
    gender: str | None
    address: str | None
    city: str | None
    pincode: str | None
    blood_group: str | None
    user: UserOut
