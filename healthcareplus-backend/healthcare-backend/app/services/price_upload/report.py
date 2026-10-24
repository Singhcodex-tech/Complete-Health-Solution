"""Turn a parsed file + plan into the JSON report the admin UI shows."""
from __future__ import annotations

import difflib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lab_price import Test
from app.schemas.price_upload import (
    BranchPreviewOut,
    PreviewRowOut,
    PriceUploadReport,
    TestSuggestion,
    UnmatchedTestOut,
    UploadErrorOut,
    UploadSummaryOut,
)
from app.services.price_upload.parser import ParsedFile, normalize_name
from app.services.price_upload.service import Plan, summary_message

PREVIEW_ROWS = 100
BRANCH_LIMIT = 1000
SUGGEST_FOR = 100  # only compute suggestions for the first N unmatched names


def suggest_tests(db: Session, names: list[str]) -> dict[str, list[TestSuggestion]]:
    """Closest master tests for names that didn't match (typos, long-form names)."""
    master = [(n, i, name) for n, i, name in db.execute(select(Test.normalized_name, Test.id, Test.name))]
    norms = [m[0] for m in master]
    by_norm = {m[0]: m for m in master}
    out: dict[str, list[TestSuggestion]] = {}
    for name in names[:SUGGEST_FOR]:
        q = normalize_name(name)
        picks: list[str] = []
        if len(q) >= 3:
            picks += [n for n in norms if q in n or n in q][:3]
        for n in difflib.get_close_matches(q, norms, n=3, cutoff=0.72):
            if n not in picks:
                picks.append(n)
        out[name] = [TestSuggestion(id=by_norm[n][1], name=by_norm[n][2]) for n in picks[:3]]
    return out


def build_report(
    db: Session, parsed: ParsedFile, plan: Plan, dry_run: bool, committed: bool
) -> PriceUploadReport:
    cap = settings.PRICE_UPLOAD_MAX_ERRORS_RETURNED
    errors = sorted(parsed.errors, key=lambda e: (e.row, e.column))
    per_branch: dict[tuple[str, str], list] = {}
    for p in plan.prices:
        per_branch.setdefault(p.record.lab_key, []).append(p)
    new_keys = {(normalize_name(n), pin) for n, pin in plan.new_branches}
    branches = [
        BranchPreviewOut(name=v[0].record.lab_name, pin_code=k[1], prices=len(v), is_new=k in new_keys)
        for k, v in per_branch.items()
    ][:BRANCH_LIMIT]
    # suspicious jumps first, then things that will change, then unchanged
    ordered = sorted(plan.prices, key=lambda p: (not p.warning, p.status == "unchanged"))[:PREVIEW_ROWS]
    suggestions = suggest_tests(db, sorted(plan.unmatched_tests)) if plan.unmatched_tests else {}
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
        big_changes=plan.big_changes,
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
            UnmatchedTestOut(name=n, count=len(r), rows=r[:20], suggestions=suggestions.get(n, []))
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
                change_pct=p.change_pct,
                warning=p.warning,
            )
            for p in ordered
        ],
    )
