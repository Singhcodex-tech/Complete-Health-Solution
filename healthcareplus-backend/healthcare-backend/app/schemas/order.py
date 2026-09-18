from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus, OTPPurpose


class OrderCreate(BaseModel):
    lab_test_ids: list[str] = Field(min_length=1)
    pickup_address: str = Field(min_length=5, max_length=500)
    pickup_date: date
    pickup_time: time
    notes: str | None = None


class OrderAssignRider(BaseModel):
    rider_id: str


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    lab_test_id: str
    lab_company_id: str
    lab_company_name: str
    test_name: str
    price: float


class OrderLabDropoffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lab_company_id: str
    lab_company_name: str
    verified_at: datetime | None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    rider_id: str | None
    pickup_address: str
    pickup_date: date
    pickup_time: time
    notes: str | None
    total_amount: float
    status: OrderStatus
    created_at: datetime
    picked_up_at: datetime | None
    at_lab_at: datetime | None
    completed_at: datetime | None
    items: list[OrderItemOut] = []
    lab_dropoffs: list[OrderLabDropoffOut] = []


class OTPRequestPayload(BaseModel):
    purpose: OTPPurpose
    lab_company_id: str | None = None


class OTPVerifyPayload(BaseModel):
    purpose: OTPPurpose
    code: str = Field(min_length=4, max_length=8)
    lab_company_id: str | None = None


class OTPActionResponse(BaseModel):
    message: str
    order_status: OrderStatus | None = None


class RiderCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=6, max_length=128)


class RiderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    phone: str
    is_active: bool


class AnalyticsSummary(BaseModel):
    total_orders: int
    total_revenue: float
    orders_by_status: dict[str, int]
    revenue_by_lab: dict[str, float]
    rider_performance: list[dict]
