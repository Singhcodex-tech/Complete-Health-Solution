"""Bridge between branch-level prices (labs / tests / lab_test_prices) and the
existing order + rider flow, which is built on LabCompany / LabTest.

Each ordered branch gets a hidden LabCompany ("branch-<lab id>") and each
ordered test a LabTest snapshot priced from lab_test_prices at order time.
Orders, rider OTPs and per-lab drop-off then work unchanged.
"""
from sqlalchemy.orm import Session

from app.models.lab import LabCompany, LabTest
from app.models.lab_price import Lab, LabTestPrice, Test

MIRROR_PREFIX = "branch-"


def ensure_branch_test(db: Session, lab: Lab, test: Test, price: float) -> LabTest:
    slug = f"{MIRROR_PREFIX}{lab.id}"
    company = db.query(LabCompany).filter(LabCompany.slug == slug).first()
    label = f"{lab.name} ({lab.pin_code})"[:120]
    if company is None:
        company = LabCompany(slug=slug, name=label, tagline="Local partner lab")
        db.add(company)
        db.flush()
    elif company.name != label:
        company.name = label

    name = test.name[:150]
    lab_test = (
        db.query(LabTest).filter(LabTest.company_id == company.id, LabTest.name == name).first()
    )
    if lab_test is None:
        lab_test = LabTest(company_id=company.id, name=name, category="General", price=price)
        lab_test.company = company
        db.add(lab_test)
    else:
        lab_test.price = price
    db.flush()
    return lab_test


def resolve_branch_items(db: Session, items: list[tuple[str, str]]) -> list[LabTest]:
    """items = [(lab_id, test_id)]. Raises ValueError if any pair isn't priced."""
    out: list[LabTest] = []
    for lab_id, test_id in dict.fromkeys(items):  # de-dupe, keep order
        row = (
            db.query(Lab, Test, LabTestPrice)
            .join(LabTestPrice, LabTestPrice.lab_id == Lab.id)
            .join(Test, Test.id == LabTestPrice.test_id)
            .filter(Lab.id == lab_id, Test.id == test_id)
            .first()
        )
        if row is None:
            raise ValueError("One or more selected tests are no longer available at that lab.")
        lab, test, price = row
        out.append(ensure_branch_test(db, lab, test, price.price))
    return out
