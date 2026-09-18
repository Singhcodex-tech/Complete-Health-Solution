from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.lab import LabTest
from app.models.order import (
    Order,
    OrderItem,
    OrderLabDropoff,
    OrderStatus,
    OTPPurpose,
)
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.order import (
    AnalyticsSummary,
    OrderAssignRider,
    OrderCreate,
    OrderOut,
    OTPActionResponse,
    OTPRequestPayload,
    OTPVerifyPayload,
)
from app.services.otp import OTPError, create_and_send_otp, verify_otp
from app.services.sms import send_sms

router = APIRouter(prefix="/orders", tags=["Orders"])


def _load(db: Session, order_id: str) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.lab_dropoffs))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


# ---------------------------------------------------------------- Patient --

@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> Order:
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    tests = (
        db.query(LabTest)
        .options(joinedload(LabTest.company))
        .filter(LabTest.id.in_(payload.lab_test_ids))
        .all()
    )
    if len(tests) != len(set(payload.lab_test_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more selected tests are invalid.",
        )

    order = Order(
        patient_id=patient.id,
        pickup_address=payload.pickup_address,
        pickup_date=payload.pickup_date,
        pickup_time=payload.pickup_time,
        notes=payload.notes,
        total_amount=sum(t.price for t in tests),
    )
    order.items = [
        OrderItem(
            lab_test_id=t.id,
            lab_company_id=t.company_id,
            lab_company_name=t.company.name,
            test_name=t.name,
            price=t.price,
        )
        for t in tests
    ]
    # One drop-off checkpoint per distinct lab this order touches — a booking
    # spanning several labs still ends up as a single order, but the rider
    # still has to visit and verify at each lab separately.
    seen_companies: dict[str, str] = {}
    for t in tests:
        seen_companies.setdefault(t.company_id, t.company.name)
    order.lab_dropoffs = [
        OrderLabDropoff(lab_company_id=cid, lab_company_name=cname)
        for cid, cname in seen_companies.items()
    ]

    db.add(order)
    db.commit()
    db.refresh(order)

    lab_count = len(seen_companies)
    lab_note = f" across {lab_count} labs" if lab_count > 1 else ""
    send_sms(
        current_user.phone,
        f"HealthCare+: Order placed for {len(tests)} test(s){lab_note}, total Rs.{order.total_amount:.0f}. "
        f"We'll assign a rider for pickup on {order.pickup_date} at {order.pickup_time}.",
    )

    return _load(db, order.id)


@router.get("/me", response_model=list[OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> list[Order]:
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if patient is None:
        return []
    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.lab_dropoffs))
        .filter(Order.patient_id == patient.id)
        .order_by(Order.created_at.desc())
        .all()
    )


# ------------------------------------------------------------------ Admin --

@router.get("/", response_model=list[OrderOut])
def list_all_orders(
    status_filter: OrderStatus | None = None,
    rider_id: str | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[Order]:
    query = db.query(Order).options(joinedload(Order.items), joinedload(Order.lab_dropoffs))
    if status_filter is not None:
        query = query.filter(Order.status == status_filter)
    if rider_id is not None:
        query = query.filter(Order.rider_id == rider_id)
    return query.order_by(Order.created_at.desc()).all()


@router.patch("/{order_id}/assign", response_model=OrderOut)
def assign_rider(
    order_id: str,
    payload: OrderAssignRider,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> Order:
    order = _load(db, order_id)
    rider = db.get(User, payload.rider_id)
    if rider is None or rider.role != UserRole.RIDER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

    order.rider_id = rider.id
    order.status = OrderStatus.ASSIGNED
    db.commit()
    db.refresh(order)

    send_sms(
        rider.phone,
        f"HealthCare+: New pickup assigned — order #{order.id[:8]}, "
        f"{order.pickup_date} at {order.pickup_time}, address: {order.pickup_address}.",
    )
    return _load(db, order.id)


@router.patch("/{order_id}/complete", response_model=OrderOut)
def complete_order(
    order_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> Order:
    """Admin-only close-out: reports are sent to the patient on WhatsApp
    outside this app, so there's no rider-side OTP for this step. Admin
    marks the order complete once the patient has actually received it."""
    order = _load(db, order_id)
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cancelled orders can't be completed."
        )
    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return _load(db, order.id)


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AnalyticsSummary:
    orders = db.query(Order).options(joinedload(Order.items)).all()

    orders_by_status: dict[str, int] = {}
    revenue_by_lab: dict[str, float] = {}
    rider_stats: dict[str, dict] = {}
    total_revenue = 0.0

    riders = {r.id: r.full_name for r in db.query(User).filter(User.role == UserRole.RIDER).all()}

    for order in orders:
        orders_by_status[order.status.value] = orders_by_status.get(order.status.value, 0) + 1

        if order.status != OrderStatus.CANCELLED:
            total_revenue += order.total_amount
            # Revenue is attributed per item's lab, since one order can span
            # several labs now.
            for item in order.items:
                revenue_by_lab[item.lab_company_name] = (
                    revenue_by_lab.get(item.lab_company_name, 0) + item.price
                )

        if order.rider_id:
            rider_name = riders.get(order.rider_id, "Unknown rider")
            stat = rider_stats.setdefault(
                order.rider_id,
                {"rider_id": order.rider_id, "rider_name": rider_name, "orders_assigned": 0,
                 "orders_completed": 0, "revenue_handled": 0.0},
            )
            stat["orders_assigned"] += 1
            if order.status == OrderStatus.COMPLETED:
                stat["orders_completed"] += 1
                stat["revenue_handled"] += order.total_amount

    return AnalyticsSummary(
        total_orders=len(orders),
        total_revenue=total_revenue,
        orders_by_status=orders_by_status,
        revenue_by_lab=revenue_by_lab,
        rider_performance=list(rider_stats.values()),
    )


# ------------------------------------------------------------------ Rider --

@router.get("/rider/me", response_model=list[OrderOut])
def list_my_assigned_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RIDER)),
) -> list[Order]:
    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.lab_dropoffs))
        .filter(Order.rider_id == current_user.id, Order.status != OrderStatus.COMPLETED)
        .order_by(Order.pickup_date, Order.pickup_time)
        .all()
    )


def _order_and_patient(db: Session, order_id: str, rider: User) -> tuple[Order, Patient]:
    order = _load(db, order_id)
    if order.rider_id != rider.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This order isn't assigned to you"
        )
    patient = db.get(Patient, order.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return order, patient


@router.post("/{order_id}/otp/request", response_model=OTPActionResponse)
def request_order_otp(
    order_id: str,
    payload: OTPRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RIDER)),
) -> OTPActionResponse:
    if payload.purpose == OTPPurpose.RIDER_LOGIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="That purpose isn't valid for an order"
        )

    order, patient = _order_and_patient(db, order_id, current_user)
    patient_user = db.get(User, patient.user_id)
    if patient_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient contact not found")

    if payload.purpose == OTPPurpose.LAB_DROPOFF:
        if payload.lab_company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="lab_company_id is required for a lab_dropoff OTP.",
            )
        dropoff = next(
            (d for d in order.lab_dropoffs if d.lab_company_id == payload.lab_company_id), None
        )
        if dropoff is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="This order has no items for that lab."
            )
        if dropoff.verified_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="This lab's drop-off is already verified."
            )

    # OTP always goes to the patient's phone — they're the one confirming
    # pickup/dropoff of their own sample, whoever holds the phone at the lab
    # side for lab_dropoff should relay the code to the rider.
    create_and_send_otp(
        db,
        purpose=payload.purpose,
        to_phone=patient_user.phone,
        order_id=order.id,
        lab_company_id=payload.lab_company_id,
    )
    return OTPActionResponse(message=f"OTP sent for {payload.purpose.value}.")


@router.post("/{order_id}/otp/verify", response_model=OTPActionResponse)
def verify_order_otp(
    order_id: str,
    payload: OTPVerifyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RIDER)),
) -> OTPActionResponse:
    if payload.purpose == OTPPurpose.RIDER_LOGIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="That purpose isn't valid for an order"
        )

    order, _patient = _order_and_patient(db, order_id, current_user)

    if payload.purpose == OTPPurpose.LAB_DROPOFF and payload.lab_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lab_company_id is required for a lab_dropoff OTP.",
        )

    try:
        verify_otp(
            db,
            purpose=payload.purpose,
            code=payload.code,
            order_id=order.id,
            lab_company_id=payload.lab_company_id,
        )
    except OTPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    now = datetime.now(timezone.utc)

    if payload.purpose == OTPPurpose.PICKUP:
        order.status = OrderStatus.PICKED_UP
        order.picked_up_at = now
        db.commit()
        return OTPActionResponse(
            message="Verified — sample picked up.", order_status=order.status
        )

    # LAB_DROPOFF: mark that specific lab's checkpoint, then only advance the
    # order once every lab it touches has been verified.
    dropoff = next(d for d in order.lab_dropoffs if d.lab_company_id == payload.lab_company_id)
    dropoff.verified_at = now

    if all(d.verified_at is not None for d in order.lab_dropoffs):
        order.status = OrderStatus.AT_LAB
        order.at_lab_at = now
        message = "Verified — all labs confirmed, order awaiting report."
    else:
        remaining = sum(1 for d in order.lab_dropoffs if d.verified_at is None)
        message = f"Verified for {dropoff.lab_company_name} — {remaining} lab(s) still pending."

    db.commit()
    return OTPActionResponse(message=message, order_status=order.status)
