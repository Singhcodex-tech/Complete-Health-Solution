"""Plan (dry run) and commit price uploads.

`build_plan` only READS the database. `commit_plan` writes everything in the
caller's single transaction (caller commits / rolls back).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lab_price import Lab, LabTestPrice, Test, TestAlias
from app.services.price_upload.categories import category_for
from app.services.price_upload.parser import ParsedFile, PriceRecord, normalize_name

CHUNK = 1000
IN_CHUNK = 500  # stay under SQLite's variable limit on old builds

Progress = Callable[[int, str], None]  # (percent 0-100, stage label)


def _chunks(seq: list, n: int) -> Iterator[list]:
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def _new_id() -> str:
    return str(uuid.uuid4())


@dataclass
class PlannedPrice:
    record: PriceRecord
    status: str  # "new" | "changed" | "unchanged"
    old_price: float | None = None
    test_id: str | None = None  # known master test (matched by name or alias)

    @property
    def change_pct(self) -> float | None:
        if self.status != "changed" or not self.old_price:
            return None
        return round((self.record.price - self.old_price) / self.old_price * 100, 1)

    @property
    def warning(self) -> bool:
        pct = self.change_pct
        return pct is not None and abs(pct) > settings.PRICE_JUMP_WARN_PCT


@dataclass
class Plan:
    prices: list[PlannedPrice] = field(default_factory=list)
    unmatched_tests: dict[str, list[int]] = field(default_factory=dict)  # display name -> rows
    new_branches: list[tuple[str, str]] = field(default_factory=list)  # (display name, pin)
    new_tests: list[str] = field(default_factory=list)  # display names (auto-create only)
    auto_create_tests: bool = False

    @property
    def new_count(self) -> int:
        return sum(1 for p in self.prices if p.status == "new")

    @property
    def changed_count(self) -> int:
        return sum(1 for p in self.prices if p.status == "changed")

    @property
    def unchanged_count(self) -> int:
        return sum(1 for p in self.prices if p.status == "unchanged")

    @property
    def big_changes(self) -> int:
        return sum(1 for p in self.prices if p.warning)

    @property
    def written(self) -> list[PlannedPrice]:
        return [p for p in self.prices if p.status != "unchanged"]

    @property
    def branches_touched(self) -> int:
        return len({p.record.lab_key for p in self.written})


@dataclass
class CommitResult:
    # (lab_id, test_id, old_price | None, new_price) — everything needed to undo
    changes: list[tuple[str, str, float | None, float]] = field(default_factory=list)
    created_labs: list[str] = field(default_factory=list)
    created_tests: list[str] = field(default_factory=list)


def build_plan(
    db: Session,
    parsed: ParsedFile,
    auto_create_tests: bool = False,
    progress: Progress | None = None,
) -> Plan:
    plan = Plan(auto_create_tests=auto_create_tests)

    # Master names AND aliases ("Complete Blood Count" -> CBC) resolve to a test id.
    tests = {n: i for n, i in db.execute(select(Test.normalized_name, Test.id))}
    aliases = {a: t for a, t in db.execute(select(TestAlias.alias_normalized, TestAlias.test_id))}
    resolve = {**aliases, **tests}  # a real master name always beats an alias
    labs = {
        (n, p): i for n, p, i in db.execute(select(Lab.normalized_name, Lab.pin_code, Lab.id))
    }
    if progress:
        progress(40, "Matching tests and labs")

    seen_new_labs: set[tuple[str, str]] = set()
    seen_new_tests: set[str] = set()
    matched: list[tuple[PriceRecord, str | None, str | None]] = []  # rec, lab_id, test_id
    for rec in parsed.records:
        tid = resolve.get(rec.test_key)
        if tid is None:
            if not auto_create_tests:
                plan.unmatched_tests.setdefault(rec.test_name, []).append(rec.row)
                continue
            if rec.test_key not in seen_new_tests:
                seen_new_tests.add(rec.test_key)
                plan.new_tests.append(rec.test_name)
        lid = labs.get(rec.lab_key)
        if lid is None and rec.lab_key not in seen_new_labs:
            seen_new_labs.add(rec.lab_key)
            plan.new_branches.append((rec.lab_name, rec.pin_code))
        matched.append((rec, lid, tid))
    if progress:
        progress(45, "Comparing with current prices")

    existing: dict[tuple[str, str], float] = {}
    lab_ids = sorted({lid for _, lid, _ in matched if lid})
    for chunk in _chunks(lab_ids, IN_CHUNK):
        for lab_id, test_id, price in db.execute(
            select(LabTestPrice.lab_id, LabTestPrice.test_id, LabTestPrice.price).where(
                LabTestPrice.lab_id.in_(chunk)
            )
        ):
            existing[(lab_id, test_id)] = price

    for rec, lid, tid in matched:
        old = existing.get((lid, tid)) if (lid and tid) else None
        if old is None:
            plan.prices.append(PlannedPrice(rec, "new", test_id=tid))
        elif abs(old - rec.price) < 0.005:
            plan.prices.append(PlannedPrice(rec, "unchanged", old, tid))
        else:
            plan.prices.append(PlannedPrice(rec, "changed", old, tid))
    return plan


# ---------- writing -------------------------------------------------------
def _upsert_stmt(db: Session, model, index_elements: list[str], update_cols: list[str] | None):
    """Dialect-aware INSERT ... ON CONFLICT (UPSERT / DO NOTHING)."""
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        raise RuntimeError(f"Bulk upsert supports PostgreSQL and SQLite, not {dialect}")
    stmt = insert(model)
    if update_cols:
        return stmt.on_conflict_do_update(
            index_elements=index_elements, set_={c: getattr(stmt.excluded, c) for c in update_cols}
        )
    return stmt.on_conflict_do_nothing(index_elements=index_elements)


def commit_plan(
    db: Session, parsed: ParsedFile, plan: Plan, progress: Progress | None = None
) -> CommitResult:
    """Write the plan. Caller owns the transaction (commit / rollback).

    Re-resolves ids inside the transaction so a concurrent upload can't cause
    duplicates (inserts use ON CONFLICT DO NOTHING, prices use UPSERT).
    Returns everything needed to undo it later.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = CommitResult()
    written = plan.written
    if not written:
        return result

    # 1) tests that must exist (auto-create toggle) — display name = first spelling seen
    if plan.auto_create_tests:
        wanted: dict[str, str] = {}
        for p in written:
            if p.test_id is None:
                wanted.setdefault(p.record.test_key, p.record.test_name)
        stmt = _upsert_stmt(db, Test, ["normalized_name"], None)
        rows = [
            {"id": _new_id(), "name": n, "normalized_name": k, "category": category_for(k)}
            for k, n in wanted.items()
        ]
        for chunk in _chunks(rows, CHUNK):
            db.execute(stmt, chunk)

    # 2) labs that must exist
    lab_wanted: dict[tuple[str, str], str] = {}
    for p in written:
        lab_wanted.setdefault(p.record.lab_key, p.record.lab_name)
    stmt = _upsert_stmt(db, Lab, ["normalized_name", "pin_code"], None)
    rows = [
        {"id": _new_id(), "name": n, "normalized_name": k[0], "pin_code": k[1]}
        for k, n in lab_wanted.items()
    ]
    for chunk in _chunks(rows, CHUNK):
        db.execute(stmt, chunk)

    # 3) id lookups
    lab_ids = {
        (n, p): i for n, p, i in db.execute(select(Lab.normalized_name, Lab.pin_code, Lab.id))
    }
    test_ids = {n: i for n, i in db.execute(select(Test.normalized_name, Test.id))}

    new_lab_keys = {(normalize_name(n), pin) for n, pin in plan.new_branches}
    result.created_labs = [lab_ids[k] for k in new_lab_keys if k in lab_ids]
    new_test_keys = {normalize_name(n) for n in plan.new_tests}
    result.created_tests = [test_ids[k] for k in new_test_keys if k in test_ids]

    # 4) UPSERT prices in batches
    price_rows = []
    for p in written:
        lid = lab_ids[p.record.lab_key]
        tid = p.test_id or test_ids[p.record.test_key]
        price_rows.append({"lab_id": lid, "test_id": tid, "price": p.record.price, "updated_at": now})
        result.changes.append((lid, tid, p.old_price, p.record.price))
    stmt = _upsert_stmt(db, LabTestPrice, ["lab_id", "test_id"], ["price", "updated_at"])
    done = 0
    for chunk in _chunks(price_rows, CHUNK):
        db.execute(stmt, chunk)
        done += len(chunk)
        if progress:
            progress(int(done / len(price_rows) * 100), f"Saved {done:,} of {len(price_rows):,} prices")
    return result


def import_test_names(db: Session, names: list[str]) -> tuple[int, int]:
    """Insert names missing from the master list. Returns (added, already_existed)."""
    existing = {n for (n,) in db.execute(select(Test.normalized_name))}
    aliases = {a for (a,) in db.execute(select(TestAlias.alias_normalized))}
    fresh = [n for n in names if normalize_name(n) not in existing and normalize_name(n) not in aliases]
    stmt = _upsert_stmt(db, Test, ["normalized_name"], None)
    rows = [
        {
            "id": _new_id(),
            "name": n,
            "normalized_name": normalize_name(n),
            "category": category_for(normalize_name(n)),
        }
        for n in fresh
    ]
    for chunk in _chunks(rows, CHUNK):
        db.execute(stmt, chunk)
    return len(fresh), len(names) - len(fresh)


def summary_message(plan: Plan, error_count: int) -> str:
    return (
        f"Updated {len(plan.written)} prices across {plan.branches_touched} branches. "
        f"{plan.new_count} new, {plan.changed_count} changed, {error_count} errors"
    )
