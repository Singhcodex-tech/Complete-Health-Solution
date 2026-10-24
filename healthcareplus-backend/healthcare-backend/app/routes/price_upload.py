import json

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.config import settings
from app.database import get_db
from app.models.lab_price import PriceUploadJob, Test, TestAlias
from app.models.user import User, UserRole
from app.schemas.price_upload import (
    AliasIn,
    CategoryIn,
    JobHistoryItem,
    JobOut,
    PincodeImportOut,
    PriceUploadReport,
    TestListImportOut,
)
from app.services.pincode_geo import import_pincode_rows
from app.services.price_upload import jobs
from app.services.price_upload.categories import CATEGORIES
from app.services.price_upload.parser import (
    FileFormatError,
    ParsedFile,
    normalize_name as _norm,
    parse_file,
    parse_test_list,
    read_rows,
)
from app.services.price_upload.report import build_report
from app.services.price_upload.service import build_plan, commit_plan, import_test_names

router = APIRouter(prefix="/price-uploads", tags=["Price Upload"])

ALLOWED_EXT = (".csv", ".xlsx")
Admin = Depends(require_roles(UserRole.ADMIN))


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


# ======================================================================
# Small files: synchronous preview / commit (kept for scripts and tests)
# ======================================================================
@router.post("/preview", response_model=PriceUploadReport)
def preview_upload(
    file: UploadFile,
    auto_create_tests: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Admin,
) -> PriceUploadReport:
    """Dry run: parse + validate the whole file, write NOTHING."""
    name, raw = _read_upload(file)
    parsed = _parse_or_400(name, raw)
    plan = build_plan(db, parsed, auto_create_tests)
    return build_report(db, parsed, plan, dry_run=True, committed=False)


@router.post("/commit", response_model=PriceUploadReport)
def commit_upload(
    file: UploadFile,
    auto_create_tests: bool = Form(False),
    allow_partial: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Admin,
) -> PriceUploadReport:
    """Re-validate, then write everything in ONE transaction (all or nothing).

    Not undoable and no progress — big files should use /jobs instead.
    """
    name, raw = _read_upload(file)
    parsed = _parse_or_400(name, raw)
    plan = build_plan(db, parsed, auto_create_tests)
    if parsed.errors and not allow_partial:
        report = build_report(db, parsed, plan, dry_run=False, committed=False)
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
    return build_report(db, parsed, plan, dry_run=False, committed=True)


# ======================================================================
# Background jobs: progress, history, undo
# ======================================================================
def _job_out(job: PriceUploadJob) -> JobOut:
    pct, stage = jobs.get_progress(job)
    report = json.loads(job.report) if job.report else None
    return JobOut(
        id=job.id,
        kind=job.kind,
        status=job.status,
        progress=pct,
        stage=stage,
        filename=job.filename,
        message=(report or {}).get("message"),
        error=job.error,
        report=report,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


def _get_job(db: Session, job_id: str) -> PriceUploadJob:
    job = db.get(PriceUploadJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload not found.")
    return job


def _busy_check(db: Session) -> None:
    if jobs.active_write_job(db):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Another upload is still running. Wait for it to finish, then try again.",
        )


def _start(db: Session, bg: BackgroundTasks, job: PriceUploadJob) -> JobOut:
    db.add(job)
    db.commit()
    jobs.set_progress(job.id, 0, "Waiting to start")
    bg.add_task(jobs.run_job, job.id)
    return _job_out(job)


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    file: UploadFile,
    bg: BackgroundTasks,
    mode: str = Form("preview"),
    auto_create_tests: bool = Form(False),
    allow_partial: bool = Form(False),
    db: Session = Depends(get_db),
    admin: User = Admin,
) -> JobOut:
    """Start a background preview (default) or direct commit. Poll GET /jobs/{id}."""
    if mode not in ("preview", "commit"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "mode must be preview or commit.")
    name, raw = _read_upload(file)
    if mode == "commit":
        _busy_check(db)
    jobs.cleanup_old_files()
    job = PriceUploadJob(
        kind=mode,
        filename=name,
        created_by=admin.id,
        options=json.dumps({"auto_create_tests": auto_create_tests, "allow_partial": allow_partial}),
    )
    db.add(job)
    db.flush()
    job.file_path = jobs.save_upload(job.id, name, raw)
    return _start(db, bg, job)


@router.post("/jobs/{job_id}/commit", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def commit_from_preview(
    job_id: str,
    bg: BackgroundTasks,
    allow_partial: bool = Form(False),
    db: Session = Depends(get_db),
    admin: User = Admin,
) -> JobOut:
    """Confirm a finished preview: saves exactly that file (no second upload)."""
    prev = _get_job(db, job_id)
    if prev.kind != "preview" or prev.status != "done":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only a finished preview can be confirmed.")
    from pathlib import Path

    if not prev.file_path or not Path(prev.file_path).exists():
        raise HTTPException(status.HTTP_410_GONE, "That preview has expired. Please upload the file again.")
    _busy_check(db)
    opts = json.loads(prev.options or "{}")
    opts["allow_partial"] = allow_partial
    job = PriceUploadJob(
        kind="commit",
        filename=prev.filename,
        created_by=admin.id,
        options=json.dumps(opts),
        file_path=prev.file_path,
        target_job_id=prev.id,
    )
    return _start(db, bg, job)


@router.get("/jobs", response_model=list[JobHistoryItem])
def history(
    limit: int = 20, db: Session = Depends(get_db), _admin: User = Admin
) -> list[JobHistoryItem]:
    """Recent saves and undos (previews are not listed)."""
    from pathlib import Path

    rows = db.execute(
        select(PriceUploadJob, User.full_name)
        .outerjoin(User, User.id == PriceUploadJob.created_by)
        .where(PriceUploadJob.kind.in_(("commit", "undo")))
        .order_by(PriceUploadJob.created_at.desc())
        .limit(max(1, min(limit, 100)))
    ).all()
    out = []
    for job, who in rows:
        report = json.loads(job.report) if job.report else {}
        out.append(
            JobHistoryItem(
                id=job.id,
                kind=job.kind,
                status=job.status,
                filename=job.filename,
                by=who,
                message=report.get("message"),
                error=job.error,
                created_at=job.created_at,
                finished_at=job.finished_at,
                can_undo=(
                    job.kind == "commit"
                    and job.status == "done"
                    and bool(job.changes_path)
                    and Path(job.changes_path).exists()
                ),
            )
        )
    return out


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db), _admin: User = Admin) -> JobOut:
    return _job_out(_get_job(db, job_id))


@router.post("/jobs/{job_id}/undo", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def undo_job(
    job_id: str,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Admin,
) -> JobOut:
    """Revert a saved upload: restores old prices, removes prices it added.

    Prices edited by a LATER upload are left alone and counted as skipped.
    """
    target = _get_job(db, job_id)
    if target.kind != "commit" or target.status != "done":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only a saved upload can be undone.")
    _busy_check(db)
    job = PriceUploadJob(
        kind="undo",
        filename=target.filename,
        created_by=admin.id,
        target_job_id=target.id,
    )
    return _start(db, bg, job)


# ======================================================================
# Master test list, aliases, categories, pin-code coordinates
# ======================================================================
@router.post("/tests", response_model=TestListImportOut)
def import_master_tests(
    file: UploadFile,
    dry_run: bool = Form(False),
    db: Session = Depends(get_db),
    _admin: User = Admin,
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


@router.post("/aliases", status_code=status.HTTP_201_CREATED)
def add_alias(payload: AliasIn, db: Session = Depends(get_db), _admin: User = Admin) -> dict:
    """Teach the matcher that another spelling means an existing test."""
    key = _norm(payload.alias)
    if not key or len(key) > 500:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Alias is empty or too long.")
    if db.get(Test, payload.test_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found.")
    if db.scalar(select(Test.id).where(Test.normalized_name == key)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That name is already a real test in the master list.")
    existing = db.get(TestAlias, key)
    if existing and existing.test_id != payload.test_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "That alias already points to a different test.")
    if existing is None:
        db.add(TestAlias(alias_normalized=key, alias=payload.alias.strip()[:500], test_id=payload.test_id))
        db.commit()
    return {"alias": payload.alias.strip(), "test_id": payload.test_id}


@router.patch("/tests/{test_id}")
def set_test_category(
    test_id: str, payload: CategoryIn, db: Session = Depends(get_db), _admin: User = Admin
) -> dict:
    if payload.category not in CATEGORIES + ["General"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Category must be one of: {', '.join(CATEGORIES + ['General'])}")
    t = db.get(Test, test_id)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found.")
    t.category = payload.category
    db.commit()
    return {"id": t.id, "name": t.name, "category": t.category}


@router.post("/pincodes", response_model=PincodeImportOut)
def import_pincodes(
    file: UploadFile, db: Session = Depends(get_db), _admin: User = Admin
) -> PincodeImportOut:
    """Load pin-code coordinates (columns: pincode, latitude, longitude), e.g. the
    India Post dataset from data.gov.in. Skips the slow per-pin lookup."""
    name, raw = _read_upload(file)
    try:
        rows = read_rows(name, raw)
        saved, skipped = import_pincode_rows(db, rows)
    except FileFormatError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return PincodeImportOut(saved=saved, skipped=skipped)
