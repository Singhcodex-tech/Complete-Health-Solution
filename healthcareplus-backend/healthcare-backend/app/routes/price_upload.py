from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.lab_price import Test

from app.auth.dependencies import require_roles
from app.core.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.price_upload import (
    BranchPreviewOut,
    PreviewRowOut,
    PriceUploadReport,
    TestListImportOut,
    UnmatchedTestOut,
    UploadErrorOut,
    UploadSummaryOut,
)
from app.services.price_upload.parser import (
    FileFormatError,
    ParsedFile,
    normalize_name as _norm,
    parse_file,
    parse_test_list,
)
from app.services.price_upload.service import (
    Plan,
    build_plan,
    commit_plan,
    import_test_names,
    summary_message,
)

router = APIRouter(prefix="/price-uploads", tags=["Price Upload"])

ALLOWED_EXT = (".csv", ".xlsx")
PREVIEW_ROWS = 100
BRANCH_LIMIT = 1000


def _read_upload(file: UploadFile) -> tuple[str, bytes]:
    name = file.filename or ""
    if not name.lower().endswith(ALLOWED_EXT):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only .csv and .xlsx files are accepted.")
    limit = settings.PRICE_UPLOAD_MAX_MB * 1024 * 1024
    raw = file.file.read(limit + 1)
    if len(raw) > limit:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"File is larger than {settings.PRICE_UPLOAD_MAX_MB} MB.",
        )
    if name.lower().endswith(".xlsx") and not raw.startswith(b"PK"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That is not a real .xlsx file.")
    return name, raw


def _report(parsed: ParsedFile, plan: Plan, dry_run: bool, committed: bool) -> PriceUploadReport:
    cap = settings.PRICE_UPLOAD_MAX_ERRORS_RETURNED
    errors = sorted(parsed.errors, key=lambda e: (e.row, e.column))
    per_branch: dict[tuple[str, str], list] = {}
    for p in plan.prices:
        per_branch.setdefault(p.record.lab_key, []).append(p)
    new_keys = {(_norm(n), pin) for n, pin in plan.new_branches}
    branches = [
        BranchPreviewOut(
            name=v[0].record.lab_name, pin_code=k[1], prices=len(v), is_new=k in new_keys
        )
        for k, v in per_branch.items()
    ][:BRANCH_LIMIT]
    # show changed/new first in the preview so admin sees what will move
    ordered = sorted(plan.prices, key=lambda p: p.status == "unchanged")[:PREVIEW_ROWS]
    summary = UploadSummaryOut(
        prices_updated=len(plan.written),
        branches=plan.branches_touched,
        new=plan.new_count,
        changed=plan.changed_count,
        unchanged=plan.unchanged_count,
        errors=len(errors),
        new_branches=len(plan.new_branches),
        new_tests=len(plan.new_tests),
        unmatched_tests=len(plan.unmatched_tests),
    )
    return PriceUploadReport(
        layout=parsed.layout,
        dry_run=dry_run,
        committed=committed,
        message=summary_message(plan, len(errors)),
        summary=summary,
        errors=[UploadErrorOut(row=e.row, column=e.column, reason=e.reason) for e in errors[:cap]],
        errors_truncated=len(errors) > cap,
        unmatched_tests=[
            UnmatchedTestOut(name=n, count=len(r), rows=r[:20])
            for n, r in sorted(plan.unmatched_tests.items())
        ],
        branches=branches,
        preview_rows=[
            PreviewRowOut(
                lab=p.record.lab_name,
                pin_code=p.record.pin_code,
                test=p.record.test_name,
                price=p.record.price,
                old_price=p.old_price,
                status=p.status,
                row=p.record.row,
                column=p.record.column,
            )
            for p in ordered
        ],
    )


def _parse_or_400(name: str, raw: bytes) -> ParsedFile:
    try:
        return parse_file(name, raw)
    except FileFormatError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Couldn't read that file. Check it is a valid, uncorrupted .csv or .xlsx.",
        )


@router.post("/preview", response_model=PriceUploadReport)
def preview_upload(
    file: UploadFile,
    auto_create_tests: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> PriceUploadReport:
    """Dry run: parse + validate the whole file, write NOTHING."""
    name, raw = _read_upload(file)
    parsed = _parse_or_400(name, raw)
    plan = build_plan(db, parsed, auto_create_tests)
    return _report(parsed, plan, dry_run=True, committed=False)


@router.post("/commit", response_model=PriceUploadReport)
def commit_upload(
    file: UploadFile,
    auto_create_tests: bool = Form(False),
    allow_partial: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> PriceUploadReport:
    """Re-validate, then write everything in ONE transaction (all or nothing).

    If the file has errors, nothing is saved unless allow_partial=true, in which
    case only the valid cells are saved and the errors are reported.
    """
    name, raw = _read_upload(file)
    parsed = _parse_or_400(name, raw)
    plan = build_plan(db, parsed, auto_create_tests)
    if parsed.errors and not allow_partial:
        report = _report(parsed, plan, dry_run=False, committed=False)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "message": f"{len(parsed.errors)} errors found — nothing was saved. "
                "Fix the file or choose to import valid rows only.",
                "report": report.model_dump(),
            },
        )
    try:
        commit_plan(db, parsed, plan)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Saving failed — nothing was changed. Please try again.",
        )
    return _report(parsed, plan, dry_run=False, committed=True)


@router.post("/tests", response_model=TestListImportOut)
def import_master_tests(
    file: UploadFile,
    dry_run: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> TestListImportOut:
    """Load the master test list from a one-column .csv/.xlsx of test names.

    Safe to repeat: names already in the list are left alone (matched after
    trim / lowercase / collapse spaces). dry_run=true only counts.
    """
    name, raw = _read_upload(file)
    try:
        parsed = parse_test_list(name, raw)
    except FileFormatError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Couldn't read that file.")
    if not parsed.names:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No test names found in the first column.")
    existing = {n for (n,) in db.execute(select(Test.normalized_name))}
    fresh = [n for n in parsed.names if _norm(n) not in existing]
    if dry_run:
        added, already = len(fresh), len(parsed.names) - len(fresh)
    else:
        try:
            added, already = import_test_names(db, parsed.names)
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Saving failed — nothing was changed.")
    total = db.scalar(select(func.count()).select_from(Test)) or 0
    return TestListImportOut(
        committed=not dry_run,
        total_rows=parsed.total_rows,
        added=added,
        already_existed=already,
        duplicates_in_file=parsed.duplicates_in_file,
        blank_rows=parsed.blank_rows,
        too_long_rows=parsed.too_long[:50],
        master_total=total,
        sample_new=fresh[:10],
    )
