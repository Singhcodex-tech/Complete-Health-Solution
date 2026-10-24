from datetime import datetime

from pydantic import BaseModel


class UploadErrorOut(BaseModel):
    row: int
    column: str
    reason: str


class TestSuggestion(BaseModel):
    id: str
    name: str


class UnmatchedTestOut(BaseModel):
    name: str
    count: int
    rows: list[int]
    suggestions: list[TestSuggestion] = []


class PreviewRowOut(BaseModel):
    lab: str
    pin_code: str
    test: str
    price: float
    old_price: float | None = None
    status: str  # new | changed | unchanged
    row: int
    column: str
    change_pct: float | None = None
    warning: bool = False  # price moved more than PRICE_JUMP_WARN_PCT


class BranchPreviewOut(BaseModel):
    name: str
    pin_code: str
    prices: int
    is_new: bool


class UploadSummaryOut(BaseModel):
    prices_updated: int
    branches: int
    new: int
    changed: int
    unchanged: int
    errors: int
    new_branches: int
    new_tests: int
    unmatched_tests: int
    big_changes: int = 0


class PriceUploadReport(BaseModel):
    layout: str  # wide | long
    dry_run: bool
    committed: bool
    message: str
    summary: UploadSummaryOut
    errors: list[UploadErrorOut]
    errors_truncated: bool
    unmatched_tests: list[UnmatchedTestOut]
    branches: list[BranchPreviewOut]
    preview_rows: list[PreviewRowOut]


class TestListImportOut(BaseModel):
    committed: bool
    total_rows: int
    added: int
    already_existed: int
    duplicates_in_file: int
    blank_rows: int
    too_long_rows: list[int]
    master_total: int
    sample_new: list[str]


class JobOut(BaseModel):
    id: str
    kind: str  # preview | commit | undo
    status: str  # queued | running | done | failed | undone
    progress: int
    stage: str
    filename: str
    message: str | None = None
    error: str | None = None
    report: dict | None = None  # PriceUploadReport (preview/commit) or undo summary
    created_at: datetime
    finished_at: datetime | None = None


class JobHistoryItem(BaseModel):
    id: str
    kind: str
    status: str
    filename: str
    by: str | None
    message: str | None
    error: str | None
    created_at: datetime
    finished_at: datetime | None
    can_undo: bool


class AliasIn(BaseModel):
    alias: str
    test_id: str


class CategoryIn(BaseModel):
    category: str


class PincodeImportOut(BaseModel):
    saved: int
    skipped: int


# ---- public search / compare ----
class PriceSearchResult(BaseModel):
    lab_id: str
    lab_name: str
    pin_code: str
    price: float
    match: str  # exact | nearby | any
    distance_km: float | None = None
    updated_at: str


class PriceSearchOut(BaseModel):
    test: TestSuggestion
    pin_code: str | None
    results: list[PriceSearchResult]


class LabBranchOut(BaseModel):
    id: str
    name: str
    pin_code: str
    match: str
    distance_km: float | None = None
    test_count: int


class LabPriceLine(BaseModel):
    test_id: str
    test_name: str
    price: float


class LabDetailOut(BaseModel):
    id: str
    name: str
    pin_code: str
    last_updated: str | None = None
    tests: list[LabPriceLine]


class CompareBranch(BaseModel):
    id: str
    name: str
    pin_code: str
    match: str  # exact | nearby
    distance_km: float | None = None
    last_updated: str | None = None
    test_count: int


class CompareRow(BaseModel):
    test_id: str
    test_name: str
    category: str
    prices: dict[str, float]  # lab_id -> price (missing = not offered)


class CompareOut(BaseModel):
    pin_code: str
    branches: list[CompareBranch]
    rows: list[CompareRow]
    total_tests: int
    page: int
    page_size: int
    categories: list[str]


class ReverseGeoOut(BaseModel):
    pin_code: str
    area: str | None = None
    city: str | None = None
    state: str | None = None
