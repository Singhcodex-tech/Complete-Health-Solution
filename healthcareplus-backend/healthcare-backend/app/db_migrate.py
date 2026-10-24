"""Tiny additive migrations for tables that already exist.

`Base.metadata.create_all` creates missing TABLES but never adds columns to
existing ones. Anything added after the first release goes here, so upgrading
doesn't need a manual ALTER. Safe to run on every start.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.services.price_upload.categories import category_for

# (table, column, DDL type)
ADD_COLUMNS = [
    ("tests", "category", "VARCHAR(80)"),
]


def ensure_columns(engine: Engine) -> None:
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table, column, ddl in ADD_COLUMNS:
            if table not in tables:
                continue
            if column in {c["name"] for c in insp.get_columns(table)}:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def backfill_test_categories(engine: Engine) -> int:
    """Give every test without a category one from the keyword list (once)."""
    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT id, normalized_name FROM tests WHERE category IS NULL")
        ).all()
        for chunk_start in range(0, len(rows), 1000):
            conn.execute(
                text("UPDATE tests SET category = :c WHERE id = :i"),
                [
                    {"c": category_for(n), "i": i}
                    for i, n in rows[chunk_start : chunk_start + 1000]
                ],
            )
    return len(rows)
