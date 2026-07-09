from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict

from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    service_slug: str
    preferred_date: date
    preferred_time: time
    is_emergency: bool = False
    notes: str | None = None
    doctor_id: str | None = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: str | None
    service_slug: str
    preferred_date: date
    preferred_time: time
    is_emergency: bool
    notes: str | None
    status: BookingStatus
    created_at: datetime
