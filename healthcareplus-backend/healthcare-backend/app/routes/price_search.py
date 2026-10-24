import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.core.ratelimit import rate_limit
from app.database import get_db
from app.models.lab_price import Lab, LabTestPrice, Test
from app.schemas.price_upload import (
    CompareBranch,
    CompareOut,
    CompareRow,
    LabBranchOut,
    LabDetailOut,
    LabPriceLine,
    PriceSearchOut,
    PriceSearchResult,
    TestSuggestion,
)
from app.services.nearby import nearby_labs
from app.services.price_upload.categories import CATEGORIES
from app.services.price_upload.parser import normalize_name

# Public endpoints -> per-IP limit (they can trigger a geocoder call and big queries).
router = APIRouter(
    prefix="/prices", tags=["Price Search"], dependencies=[Depends(rate_limit("prices", 120))]
)

PIN_RE = re.compile(r"^[0-9]{6}$")


def _check_pin(pin: str | None) -> str | None:
    if pin is None or pin == "":
        return None
    if not PIN_RE.match(pin):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pin code must be exactly 6 digits.")
    return pin


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


@router.get("/tests", response_model=list[TestSuggestion])
def suggest_tests(
    q: str = Query("", max_length=100),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[TestSuggestion]:
    """Typeahead over the master test list (public)."""
    stmt = select(Test.id, Test.name).order_by(Test.name).limit(limit)
    nq = normalize_name(q)
    if nq:
        stmt = stmt.where(Test.normalized_name.contains(nq, autoescape=True))
    return [TestSuggestion(id=i, name=n) for i, n in db.execute(stmt)]


@router.get("/search", response_model=PriceSearchOut)
def search_prices(
    test_id: str | None = None,
    test: str | None = Query(None, max_length=500, description="Exact test name"),
    pin_code: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> PriceSearchOut:
    """Branches offering a test, cheapest first.

    With pin_code: branches in that pin first, then branches within the nearby radius
    (real distance when pin coordinates are known, same first 3 digits otherwise),
    each group cheapest first. Without: every branch, cheapest first.
    """
    pin = _check_pin(pin_code)
    if test_id:
        t = db.get(Test, test_id)
    elif test:
        t = db.execute(
            select(Test).where(Test.normalized_name == normalize_name(test))
        ).scalar_one_or_none()
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide test_id or test.")
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found.")

    base = (
        select(Lab.id, Lab.name, Lab.pin_code, LabTestPrice.price, LabTestPrice.updated_at)
        .join(LabTestPrice, LabTestPrice.lab_id == Lab.id)
        .where(LabTestPrice.test_id == t.id)
    )
    if pin:
        near = {n.id: n for n in nearby_labs(db, pin, limit=500)}
        rows = db.execute(base.where(Lab.id.in_(list(near)))).all() if near else []
        rows.sort(key=lambda r: (near[r.id].match != "exact", r.price, r.name))
        results = [
            PriceSearchResult(
                lab_id=r.id, lab_name=r.name, pin_code=r.pin_code, price=r.price,
                match=near[r.id].match, distance_km=near[r.id].distance_km,
                updated_at=r.updated_at.isoformat(),
            )
            for r in rows[:limit]
        ]
    else:
        rows = db.execute(base.order_by(LabTestPrice.price, Lab.name).limit(limit)).all()
        results = [
            PriceSearchResult(
                lab_id=r.id, lab_name=r.name, pin_code=r.pin_code, price=r.price,
                match="any", updated_at=r.updated_at.isoformat(),
            )
            for r in rows
        ]
    return PriceSearchOut(test=TestSuggestion(id=t.id, name=t.name), pin_code=pin, results=results)


@router.get("/labs", response_model=list[LabBranchOut])
def labs_by_pin(
    pin_code: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[LabBranchOut]:
    """Branches at a pin code (exact first) or within the nearby radius."""
    pin = _check_pin(pin_code)
    if not pin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "pin_code is required.")
    labs = nearby_labs(db, pin, limit=limit)
    counts = dict(
        db.execute(
            select(LabTestPrice.lab_id, func.count())
            .where(LabTestPrice.lab_id.in_([l.id for l in labs]))
            .group_by(LabTestPrice.lab_id)
        ).all()
    ) if labs else {}
    return [
        LabBranchOut(
            id=l.id, name=l.name, pin_code=l.pin_code, match=l.match,
            distance_km=l.distance_km, test_count=counts.get(l.id, 0),
        )
        for l in labs
    ]


@router.get("/labs/{lab_id}", response_model=LabDetailOut)
def lab_detail(lab_id: str, db: Session = Depends(get_db)) -> LabDetailOut:
    """One branch with every test it offers and the price."""
    lab = db.get(Lab, lab_id)
    if lab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab branch not found.")
    rows = db.execute(
        select(Test.id, Test.name, LabTestPrice.price, LabTestPrice.updated_at)
        .join(LabTestPrice, LabTestPrice.test_id == Test.id)
        .where(LabTestPrice.lab_id == lab_id)
        .order_by(Test.name)
    ).all()
    return LabDetailOut(
        id=lab.id,
        name=lab.name,
        pin_code=lab.pin_code,
        last_updated=_iso(max((r[3] for r in rows), default=None)),
        tests=[LabPriceLine(test_id=i, test_name=n, price=p) for i, n, p, _ in rows],
    )


@router.get("/compare", response_model=CompareOut, dependencies=[Depends(rate_limit("compare", 60))])
def compare_near_pin(
    pin_code: str,
    q: str = Query("", max_length=100),
    category: str = Query("All", max_length=40),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    branch_limit: int = Query(60, ge=1, le=200),
    db: Session = Depends(get_db),
) -> CompareOut:
    """Side-by-side matrix for the labs serving a pin code.

    Columns = branches at that pin (exact first), then nearest others.
    Rows = tests offered by at least one of those branches, A-Z.
    """
    pin = _check_pin(pin_code)
    if not pin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "pin_code is required.")
    if category != "All" and category not in CATEGORIES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown category.")

    labs = nearby_labs(db, pin, limit=branch_limit)
    empty = CompareOut(
        pin_code=pin, branches=[], rows=[], total_tests=0, page=page,
        page_size=page_size, categories=CATEGORIES,
    )
    if not labs:
        return empty
    lab_ids = [l.id for l in labs]

    stats = {
        lid: (cnt, last)
        for lid, cnt, last in db.execute(
            select(LabTestPrice.lab_id, func.count(), func.max(LabTestPrice.updated_at))
            .where(LabTestPrice.lab_id.in_(lab_ids))
            .group_by(LabTestPrice.lab_id)
        )
    }
    branches = [
        CompareBranch(
            id=l.id, name=l.name, pin_code=l.pin_code, match=l.match, distance_km=l.distance_km,
            last_updated=_iso(stats.get(l.id, (0, None))[1]), test_count=stats.get(l.id, (0, None))[0],
        )
        for l in labs
    ]

    test_filter = [LabTestPrice.lab_id.in_(lab_ids)]
    nq = normalize_name(q)
    if nq:
        test_filter.append(Test.normalized_name.contains(nq, autoescape=True))
    if category != "All":
        test_filter.append(Test.category == category)
    base = (
        select(Test.id, Test.name, Test.category)
        .join(LabTestPrice, LabTestPrice.test_id == Test.id)
        .where(*test_filter)
        .group_by(Test.id, Test.name, Test.category)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    tests = db.execute(base.order_by(Test.name).offset((page - 1) * page_size).limit(page_size)).all()

    prices: dict[str, dict[str, float]] = {}
    if tests:
        for lab_id, test_id, price in db.execute(
            select(LabTestPrice.lab_id, LabTestPrice.test_id, LabTestPrice.price).where(
                LabTestPrice.lab_id.in_(lab_ids),
                LabTestPrice.test_id.in_([t.id for t in tests]),
            )
        ):
            prices.setdefault(test_id, {})[lab_id] = price

    return CompareOut(
        pin_code=pin,
        branches=branches,
        rows=[
            CompareRow(test_id=t.id, test_name=t.name, category=t.category or "General",
                       prices=prices.get(t.id, {}))
            for t in tests
        ],
        total_tests=total,
        page=page,
        page_size=page_size,
        categories=CATEGORIES,
    )
