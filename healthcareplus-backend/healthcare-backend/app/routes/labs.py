from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.lab import LabCompany, LabTest
from app.models.user import User, UserRole
from app.schemas.lab import (
    LabCompanyCreate,
    LabCompanyOut,
    LabCompanyUpdate,
    LabTestCreate,
    LabTestOut,
    LabTestUpdate,
)
from app.schemas.lab_import import LabImportResponse
from app.services.spreadsheet_import import parse_spreadsheet

router = APIRouter(prefix="/labs", tags=["Labs"])


@router.get("/", response_model=list[LabCompanyOut])
def list_lab_companies(db: Session = Depends(get_db)) -> list[LabCompany]:
    """Public — powers the /lab-partners comparison page."""
    return db.query(LabCompany).options(joinedload(LabCompany.tests)).all()


@router.post("/", response_model=LabCompanyOut, status_code=status.HTTP_201_CREATED)
def create_lab_company(
    payload: LabCompanyCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> LabCompany:
    existing = db.query(LabCompany).filter(LabCompany.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")
    company = LabCompany(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.put("/{company_id}", response_model=LabCompanyOut)
def update_lab_company(
    company_id: str,
    payload: LabCompanyUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> LabCompany:
    company = db.get(LabCompany, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab company not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_company(
    company_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    company = db.get(LabCompany, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab company not found")
    db.delete(company)
    db.commit()


@router.post(
    "/{company_id}/tests", response_model=LabTestOut, status_code=status.HTTP_201_CREATED
)
def create_lab_test(
    company_id: str,
    payload: LabTestCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> LabTest:
    company = db.get(LabCompany, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab company not found")
    test = LabTest(company_id=company_id, **payload.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.put("/tests/{test_id}", response_model=LabTestOut)
def update_lab_test(
    test_id: str,
    payload: LabTestUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> LabTest:
    """This is the endpoint that changes a test's price."""
    test = db.get(LabTest, test_id)
    if test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(test, field, value)
    db.commit()
    db.refresh(test)
    return test


@router.delete("/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_test(
    test_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    test = db.get(LabTest, test_id)
    if test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")
    db.delete(test)
    db.commit()


@router.post("/{company_id}/tests/import", response_model=LabImportResponse)
async def import_lab_tests(
    company_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> LabImportResponse:
    """Bulk-add tests to a lab from an uploaded .csv or .xlsx file.

    Column headers don't need to match exactly — "Test Name", "Investigation",
    "MRP", "Price", "TAT", "Turnaround Time" etc. are all recognized
    automatically. Only a name column and a price column are required;
    category and turnaround are optional and default to "General" / "24 hrs".
    """
    company = db.get(LabCompany, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab company not found")

    if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a .csv or .xlsx file.",
        )

    raw_bytes = await file.read()

    try:
        result = parse_spreadsheet(file.filename, raw_bytes)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Couldn't read that file. Make sure it's a valid, uncorrupted .csv or .xlsx.",
        )

    for row in result.imported:
        db.add(LabTest(company_id=company_id, **row))
    db.commit()

    return LabImportResponse(
        detected_columns=result.detected_columns,
        total_rows=result.total_rows,
        imported_count=len(result.imported),
        skipped=result.skipped,
    )
