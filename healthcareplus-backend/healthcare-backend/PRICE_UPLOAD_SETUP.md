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

---
## Hardening update (jobs, undo, rate limits, distance)
**Upload jobs** — previews and saves now run in the background with a progress bar. Every save is logged ("Recent uploads" in Admin → Labs) with an **Undo** button: it restores old prices and removes prices/branches that upload added. Prices edited by a *later* upload are left alone and counted as skipped. Undo logs + temp files live in `PRICE_UPLOAD_DIR` (default `./data/price_uploads`) — keep that folder on persistent disk and out of git. Unconfirmed previews are deleted after `PRICE_UPLOAD_KEEP_HOURS` (24).
- Progress is held in memory: run **one backend worker** for the admin API, or progress shows 0% on other workers (the final result is still correct).
- Only one save/undo can run at a time; a second returns "Another upload is still running".
- If the server restarts mid-job, the job is marked failed and nothing is half-saved.

**Price jump warning** — preview flags prices that move more than `PRICE_JUMP_WARN_PCT` (50) so an extra zero is caught before saving.

**Name matching** — unmatched tests show "Did you mean…" buttons. Clicking one saves an alias (`test_aliases`) used by every future upload. Names are also matched against aliases when you load the master list.

**Categories** — stored per test (`tests.category`), filled from keywords when a test is created; existing tests are backfilled on first start. Admin can change one: `PATCH /api/v1/price-uploads/tests/{id}` body `{"category":"Cardiac"}` (a screen for this is still to build).

**Real distance** — "nearby" = branches within `NEARBY_RADIUS_KM` (25) of the user's pin, nearest first. Pin coordinates come from `pincode_geo`:
1. Fastest/most reliable: upload a CSV with columns `pincode,latitude,longitude` (India Post dataset, data.gov.in) via `POST /api/v1/price-uploads/pincodes` (admin).
2. Otherwise coordinates are looked up once per pin and cached; new branch pins are looked up in the background after each upload (free geocoder = 1/sec).
3. If a pin has no coordinates the old "same first 3 digits" rule is used for it.

**Better GPS → pin** — set `GEOCODER_PROVIDER=google` and `GOOGLE_MAPS_API_KEY=...` in `.env` (Geocoding API enabled). Default stays free OpenStreetMap.

**Rate limits** — public endpoints: geo 20/min, compare 60/min, other price endpoints 120/min per IP (`RATE_LIMIT_ENABLED=false` to turn off). In-memory per worker; behind nginx/Cloudflare run uvicorn with `--proxy-headers` so the real visitor IP is used.

**New pages** — `/labs/<branch id>` shows one branch's tests and prices (linked from compare column headers and price search).

New `.env` options: `PRICE_UPLOAD_DIR, PRICE_UPLOAD_KEEP_HOURS, PRICE_JUMP_WARN_PCT, GEOCODER_PROVIDER, GOOGLE_MAPS_API_KEY, NEARBY_RADIUS_KM, RATE_LIMIT_ENABLED`.
Schema changes are applied automatically on start (`app/db_migrate.py`); `migrations/002_*.sql` is there for manual setups.
