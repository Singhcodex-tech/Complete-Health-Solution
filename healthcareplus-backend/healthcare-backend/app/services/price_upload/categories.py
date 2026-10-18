"""Keyword-based categories for the master test list (tests have no category column)."""
from __future__ import annotations

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Diabetes": ("glucose", "hba1c", "glycosylated", "glycated", "diabetes", "insulin", "fructosamine", "c-peptide", "microalbumin"),
    "Thyroid": ("thyroid", "tsh", "t3", "t4", "thyroxine", "triiodothyronine", "anti-tpo", "tpo", "thyroglobulin"),
    "Liver Function": ("liver", "lft", "sgot", "sgpt", "ast", "alt", "bilirubin", "alkaline phosphatase", "ggt", "albumin", "hepatitis"),
    "Kidney Function": ("kidney", "kft", "rft", "renal", "creatinine", "urea", "bun", "uric acid", "cystatin", "electrolyte"),
    "Vitamins": ("vitamin", "b12", "folate", "folic", "25-oh", "calcium", "ferritin", "iron"),
    "Cardiac": ("lipid", "cholesterol", "triglyceride", "troponin", "cardiac", "ck-mb", "bnp", "homocysteine", "lipoprotein", "hdl", "ldl", "apolipoprotein"),
    "Full Body": ("full body", "health checkup", "health check", "master health", "wellness", "executive", "comprehensive"),
}

CATEGORIES = list(CATEGORY_KEYWORDS)


def category_for(normalized_name: str) -> str:
    for cat, words in CATEGORY_KEYWORDS.items():
        if any(w in normalized_name for w in words):
            return cat
    return "General"
