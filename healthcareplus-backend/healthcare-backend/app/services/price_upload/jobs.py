"""Background upload jobs: preview / commit / undo, with progress and history.

A job row is the history entry. Progress lives in memory (writing it to the DB
mid-transaction would lock SQLite); after the job ends the DB row has the result.
Run with a single worker, or poll the same worker, if you need live progress.
"""
from __future__ import annotations

import gzip
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import bindparam, delete, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import SessionLocal
from app.models.lab_price import Lab, LabTestPrice, PriceUploadJob, Test, TestAlias
from app.services.price_upload.parser import FileFormatError, parse_file
from app.services.price_upload.report import build_report
from app.services.price_upload.service import CHUNK, CommitResult, build_plan, commit_plan

log = logging.getLogger(__name__)

session_factory = SessionLocal  # tests swap this for the in-memory session
PROGRESS: dict[str, tuple[int, str]] = {}


class JobFailed(Exception):
    """Expected failure with a message the admin should see."""


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def set_progress(job_id: str, pct: int, stage: str) -> None:
    PROGRESS[job_id] = (max(0, min(100, int(pct))), stage)


def get_progress(job: PriceUploadJob) -> tuple[int, str]:
    if job.status in ("done", "undone"):
        return 100, "Finished"
    if job.status == "failed":
        return PROGRESS.get(job.id, (0, "Failed"))[0], "Failed"
    return PROGRESS.get(job.id, (0, "Waiting to start" if job.status == "queued" else "Working"))


def upload_dir() -> Path:
    d = Path(settings.PRICE_UPLOAD_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_upload(job_id: str, filename: str, raw: bytes) -> str:
    ext = ".xlsx" if filename.lower().endswith(".xlsx") else ".csv"
    path = upload_dir() / f"{job_id}{ext}"
    path.write_bytes(raw)
    return str(path)


def cleanup_old_files() -> None:
    """Delete unconfirmed preview files older than PRICE_UPLOAD_KEEP_HOURS (undo logs stay)."""
    cutoff = time.time() - settings.PRICE_UPLOAD_KEEP_HOURS * 3600
    for p in upload_dir().glob("*"):
        if p.suffix in (".csv", ".xlsx") and p.stat().st_mtime < cutoff:
            p.unlink(missing_ok=True)


def mark_interrupted_jobs() -> None:
    """Server restarted while a job was running/queued -> it will never finish."""
    db = session_factory()
    try:
        stuck = db.scalars(select(PriceUploadJob).where(PriceUploadJob.status.in_(("queued", "running")))).all()
        for j in stuck:
            j.status = "failed"
            j.error = "The server restarted while this job was running. Nothing was saved — please run it again."
            j.finished_at = _now()
        db.commit()
    except Exception:  # table may not exist yet on a brand-new DB
        db.rollback()
    finally:
        db.close()


def active_write_job(db: Session) -> PriceUploadJob | None:
    return db.scalars(
        select(PriceUploadJob).where(
            PriceUploadJob.kind.in_(("commit", "undo")),
            PriceUploadJob.status.in_(("queued", "running")),
        )
    ).first()


# ---------------------------------------------------------------- runner
def run_job(job_id: str) -> None:
    db = session_factory()
    new_pins: list[str] = []
    try:
        job = db.get(PriceUploadJob, job_id)
        if job is None:
            return
        job.status = "running"
        db.commit()
        set_progress(job_id, 1, "Starting")
        try:
            if job.kind == "undo":
                _run_undo(db, job)
            else:
                new_pins = _run_import(db, job)
        except JobFailed as exc:
            db.rollback()
            job = db.get(PriceUploadJob, job_id)
            job.status, job.error = "failed", str(exc)
        except Exception:
            log.exception("price upload job %s crashed", job_id)
            db.rollback()
            job = db.get(PriceUploadJob, job_id)
            job.status = "failed"
            job.error = "Something went wrong while processing the file. Nothing was saved."
        job.finished_at = _now()
        db.commit()
    finally:
        db.close()
    _geocode_new_pins(new_pins)  # slow (1 req/sec on the free geocoder) -> after the job is done


def _geocode_new_pins(pins: list[str]) -> None:
    if not pins:
        return
    from app.services.pincode_geo import geocode_missing_pins

    db = session_factory()
    try:
        geocode_missing_pins(db, pins)
    except Exception:
        log.exception("geocoding new pins failed")
    finally:
        db.close()


def _run_import(db: Session, job: PriceUploadJob) -> list[str]:
    opts = json.loads(job.options or "{}")
    auto_create = bool(opts.get("auto_create_tests"))
    allow_partial = bool(opts.get("allow_partial"))
    path = Path(job.file_path) if job.file_path else None
    if path is None or not path.exists():
        raise JobFailed("The uploaded file has expired. Please upload it again.")

    set_progress(job.id, 5, "Reading file")
    raw = path.read_bytes()
    set_progress(job.id, 15, "Checking every cell")
    try:
        parsed = parse_file(job.filename, raw)
    except FileFormatError as exc:
        raise JobFailed(str(exc))
    except Exception:
        raise JobFailed("Couldn't read that file. Check it is a valid, uncorrupted .csv or .xlsx.")

    plan = build_plan(db, parsed, auto_create, progress=lambda p, s: set_progress(job.id, p, s))

    if job.kind == "preview":
        report = build_report(db, parsed, plan, dry_run=True, committed=False)
        job.report = report.model_dump_json()
        job.status = "done"
        return []

    # ---- commit
    if parsed.errors and not allow_partial:
        report = build_report(db, parsed, plan, dry_run=False, committed=False)
        job.report = report.model_dump_json()
        db.commit()  # keep the report even though the job failed
        raise JobFailed(
            f"{len(parsed.errors)} errors found — nothing was saved. "
            "Fix the file, or choose to import valid rows only."
        )
    set_progress(job.id, 50, "Saving prices")
    result = commit_plan(
        db, parsed, plan, progress=lambda p, s: set_progress(job.id, 50 + int(p * 0.45), s)
    )
    job.changes_path = _write_changes(job.id, result)
    db.commit()  # prices + undo log path become permanent together

    report = build_report(db, parsed, plan, dry_run=False, committed=True)
    job.report = report.model_dump_json()
    job.status = "done"
    path.unlink(missing_ok=True)
    return sorted({pin for _, pin in plan.new_branches})


# ---------------------------------------------------------------- undo log
def _write_changes(job_id: str, result: CommitResult) -> str | None:
    if not result.changes:
        return None
    path = upload_dir() / f"{job_id}.changes.jsonl.gz"
    with gzip.open(path, "wt", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {
                    "count": len(result.changes),
                    "created_labs": result.created_labs,
                    "created_tests": result.created_tests,
                }
            )
            + "\n"
        )
        for lab_id, test_id, old, new in result.changes:
            f.write(json.dumps([lab_id, test_id, old, new]) + "\n")
    return str(path)


def _run_undo(db: Session, job: PriceUploadJob) -> None:
    target = db.get(PriceUploadJob, job.target_job_id or "")
    if target is None or target.kind != "commit" or target.status != "done":
        raise JobFailed("That upload can't be undone.")
    if not target.changes_path or not Path(target.changes_path).exists():
        raise JobFailed("The undo log for that upload is missing, so it can't be reverted.")

    t = LabTestPrice.__table__
    del_stmt = delete(t).where(t.c.lab_id == bindparam("l"), t.c.test_id == bindparam("t"))
    upd_stmt = (
        update(t)
        .where(t.c.lab_id == bindparam("l"), t.c.test_id == bindparam("t"))
        .values(price=bindparam("p"), updated_at=bindparam("u"))
    )
    now = _now()
    restored = removed = skipped = 0

    def process(chunk: list[list]) -> None:
        nonlocal restored, removed, skipped
        if not chunk:
            return
        labs = {c[0] for c in chunk}
        tests = {c[1] for c in chunk}
        current = {
            (l, tt): p
            for l, tt, p in db.execute(
                select(t.c.lab_id, t.c.test_id, t.c.price).where(
                    t.c.lab_id.in_(labs), t.c.test_id.in_(tests)
                )
            )
        }
        to_delete, to_restore = [], []
        for lab, test, old, new in chunk:
            cur = current.get((lab, test))
            if cur is None or abs(cur - new) >= 0.005:
                skipped += 1  # edited by a later upload — leave it alone
            elif old is None:
                to_delete.append({"l": lab, "t": test})
            else:
                to_restore.append({"l": lab, "t": test, "p": old, "u": now})
        if to_delete:
            db.execute(del_stmt, to_delete)
            removed += len(to_delete)
        if to_restore:
            db.execute(upd_stmt, to_restore)
            restored += len(to_restore)

    with gzip.open(target.changes_path, "rt", encoding="utf-8") as f:
        header = json.loads(f.readline())
        total = max(1, header["count"])
        chunk: list[list] = []
        seen = 0
        for line in f:
            chunk.append(json.loads(line))
            seen += 1
            if len(chunk) >= CHUNK:
                process(chunk)
                chunk = []
                set_progress(job.id, 5 + int(seen / total * 85), f"Reverted {seen:,} of {total:,}")
        process(chunk)

    # labs / tests this upload created, if nothing uses them now
    set_progress(job.id, 92, "Cleaning up")
    in_use_labs = select(LabTestPrice.lab_id)
    for ids in _slices(header["created_labs"], 500):
        db.execute(delete(Lab.__table__).where(Lab.__table__.c.id.in_(ids), Lab.__table__.c.id.not_in(in_use_labs)))
    in_use_tests = select(LabTestPrice.test_id)
    for ids in _slices(header["created_tests"], 500):
        gone = [
            i
            for (i,) in db.execute(
                select(Test.id).where(Test.id.in_(ids), Test.id.not_in(in_use_tests))
            )
        ]
        if gone:
            db.execute(delete(TestAlias.__table__).where(TestAlias.__table__.c.test_id.in_(gone)))
            db.execute(delete(Test.__table__).where(Test.__table__.c.id.in_(gone)))

    target.status = "undone"
    msg = f"Undone: {restored} prices restored, {removed} removed"
    if skipped:
        msg += f", {skipped} left as they are (changed by a later upload)"
    job.report = json.dumps({"message": msg, "restored": restored, "removed": removed, "skipped": skipped})
    job.status = "done"
    db.commit()


def _slices(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]
