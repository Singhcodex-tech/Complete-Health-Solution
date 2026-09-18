from pydantic import BaseModel


class ImportSkippedRow(BaseModel):
    row: int
    reason: str


class LabImportResponse(BaseModel):
    detected_columns: dict[str, str]
    total_rows: int
    imported_count: int
    skipped: list[ImportSkippedRow]
