import io
import re
from dataclasses import dataclass, field

import pandas as pd

# Each field maps to a list of header aliases we'll recognize (after
# normalizing: lowercased, punctuation/spaces stripped). Order matters —
# first match wins if a header could plausibly match multiple fields.
FIELD_ALIASES: dict[str, list[str]] = {
    "name": [
        "testname", "test", "name", "investigation", "investigationname",
        "panel", "panelname", "parametername", "testdescription",
    ],
    "category": [
        "category", "type", "testcategory", "testtype", "group", "department",
        "section",
    ],
    "price": [
        "price", "cost", "amount", "rate", "mrp", "fee", "charges", "testprice",
        "finalprice", "sellingprice",
    ],
    "turnaround": [
        "turnaround", "tat", "reporttime", "duration", "time", "reportingtime",
        "turnaroundtime",
    ],
}

REQUIRED_FIELDS = ["name", "price"]


def _normalize(header: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(header).lower())


@dataclass
class ImportResult:
    detected_columns: dict[str, str]  # field -> original header name
    imported: list[dict] = field(default_factory=list)
    skipped: list[dict] = field(default_factory=list)  # {"row": int, "reason": str}
    total_rows: int = 0


def detect_columns(headers: list[str]) -> dict[str, str]:
    """Match each spreadsheet header to a known field, flexibly.

    Returns a dict like {"name": "Test Name", "price": "MRP", ...} — only
    for fields that were actually found in the sheet.
    """
    normalized_headers = {_normalize(h): h for h in headers}
    detected: dict[str, str] = {}

    for field_name, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in normalized_headers:
                detected[field_name] = normalized_headers[alias]
                break
        if field_name in detected:
            continue
        # Fallback: substring match (e.g. header "Test Name (INR)" contains "testname")
        for norm_header, original in normalized_headers.items():
            if any(alias in norm_header for alias in aliases):
                detected[field_name] = original
                break

    return detected


def parse_spreadsheet(filename: str, raw_bytes: bytes) -> ImportResult:
    lower_name = filename.lower()
    buffer = io.BytesIO(raw_bytes)

    if lower_name.endswith(".csv"):
        df = pd.read_csv(buffer)
    elif lower_name.endswith((".xlsx", ".xls")):
        df = pd.read_excel(buffer)
    else:
        raise ValueError("Unsupported file type — please upload a .csv or .xlsx file.")

    df = df.dropna(how="all")  # drop fully blank rows
    headers = [str(c) for c in df.columns]
    detected = detect_columns(headers)

    missing_required = [f for f in REQUIRED_FIELDS if f not in detected]
    if missing_required:
        raise ValueError(
            "Couldn't find a column for: "
            + ", ".join(missing_required)
            + ". Detected columns: "
            + (", ".join(f"{k} → {v}" for k, v in detected.items()) or "none")
            + ". Make sure your sheet has a test name column and a price column."
        )

    result = ImportResult(detected_columns=detected, total_rows=len(df))

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # +1 for 0-index, +1 for header row
        name = row.get(detected["name"])
        price_raw = row.get(detected["price"])

        if pd.isna(name) or str(name).strip() == "":
            result.skipped.append({"row": row_num, "reason": "Missing test name"})
            continue

        try:
            cleaned = str(price_raw).strip()
            is_negative = cleaned.startswith("-")
            numeric_part = re.sub(r"[^\d.]", "", cleaned)
            price = float(numeric_part)
            if is_negative:
                price = -price
        except (ValueError, TypeError):
            result.skipped.append(
                {"row": row_num, "reason": f"Invalid price value: {price_raw!r}"}
            )
            continue

        if price < 0:
            result.skipped.append({"row": row_num, "reason": "Price cannot be negative"})
            continue

        category = "General"
        if "category" in detected:
            cat_val = row.get(detected["category"])
            if not pd.isna(cat_val) and str(cat_val).strip():
                category = str(cat_val).strip()

        turnaround = "24 hrs"
        if "turnaround" in detected:
            tat_val = row.get(detected["turnaround"])
            if not pd.isna(tat_val) and str(tat_val).strip():
                turnaround = str(tat_val).strip()

        result.imported.append(
            {
                "name": str(name).strip(),
                "category": category,
                "price": price,
                "turnaround": turnaround,
            }
        )

    return result
