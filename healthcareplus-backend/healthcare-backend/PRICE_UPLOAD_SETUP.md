# Bulk price upload — setup

Files here mirror your repo layout. Copy `backend/*` into `healthcare-backend/` and `frontend/*` into `healthcareplus-frontend/`.
Overwritten (small edits): backend `app/models/__init__.py`, `app/core/config.py`, `app/main.py`; frontend `lib/api.ts`, `app/admin/labs/page.tsx`, `app/lab-tests/page.tsx`. **Do NOT copy an older Navbar.tsx** — Navbar is unchanged now; if you copied the earlier one, restore your original.
Delete the old `app/admin/price-upload/` folder if you copied it earlier. Diff before copying if you changed them.

## Backend
1. `pip install -r requirements.txt -r requirements-dev.txt` (no new runtime deps; openpyxl already there)
2. Start app: `uvicorn app.main:app --reload` — tables `labs`, `tests`, `lab_test_prices` auto-created (`create_all`).
   Postgres by hand: run `migrations/001_price_comparison_tables.sql`. (Repo has no Alembic.)
3. Tests: `pytest -q` (50 tests: header parsing, price validation, both layouts, upload flow, rollback, search)
4. Optional `.env`: `PRICE_UPLOAD_MAX_MB=10`, `PRICE_UPLOAD_MAX_ERRORS_RETURNED=5000`

## Frontend
- Admin: **Admin → Labs** page, card "Bulk price upload" (click to expand). Step 1 = master test list, Step 2 = prices.
- Public: `/price-search`, linked from the Lab Tests page ("Compare Prices" button)

## Endpoints (prefix /api/v1)
| Method | Path | Access |
|---|---|---|
| POST | /price-uploads/preview | admin — dry run, writes nothing. form: file, auto_create_tests |
| POST | /price-uploads/tests | admin — load master test list (one column of names). form: file, dry_run |
| POST | /price-uploads/commit | admin — one transaction. form: file, auto_create_tests, allow_partial |
| GET | /prices/tests?q= | public — typeahead |
| GET | /prices/search?test_id=&pin_code= | public — exact pin first, then same first 3 digits, cheapest first |
| GET | /prices/labs?pin_code= | public — branches at/near pin |
| GET | /prices/labs/{lab_id} | public — one branch, all tests + prices |

## First run
Master `tests` list starts EMPTY. Do Step 1 first: upload `Combined_Test_Names.xlsx` (3,203 unique names). Then price uploads match against it, and typos show as unmatched instead of polluting the list.
Try `samples/wide-sample.csv` and `samples/long-sample.csv`.

---
## Location-based labs (added)
Flow: site opens -> popup asks for location (or pin code) -> `/lab-partners` shows only labs for that pin (exact pin first, then same first 3 digits) with prices from your uploaded files.

- New endpoints: `GET /api/v1/geo/reverse?lat=&lon=` (GPS -> pin code), `GET /api/v1/prices/compare?pin_code=&q=&category=&page=` (labs x tests matrix).
- GPS needs **HTTPS** (or `localhost`) — browsers block location on plain http.
- Reverse geocoding uses OpenStreetMap Nominatim (free, ~1 request/sec policy, results cached). For heavy traffic switch to Google/MapMyIndia: only `app/routes/geo.py` changes. Set `GEOCODER_USER_AGENT` in `.env` to your real contact.
- Booking from the compare page works: ordered branches are mirrored into hidden `branch-*` lab companies so riders / OTP drop-off flow is unchanged.
- Test categories (Diabetes, Thyroid...) are keyword-based: `app/services/price_upload/categories.py`.
- Manual pin entry is always available if the user denies location.
