import io

import pytest
from sqlalchemy import create_engine, func, inspect, select, text

from app.models.lab_price import Lab, LabTestPrice, PriceUploadJob, Test, TestAlias
from app.services.price_upload.parser import normalize_name

UP = "/api/v1/price-uploads"
P = "/api/v1/prices"


def f(text_: str, name="p.csv"):
    return {"file": (name, text_.encode(), "text/csv")}


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def seed(db, *names):
    for n in names:
        db.add(Test(name=n, normalized_name=normalize_name(n)))
    db.commit()


def run(client, hdr, body, mode="preview", **data):
    r = client.post(f"{UP}/jobs", files=f(body), data={"mode": mode, **data}, headers=hdr)
    assert r.status_code == 202, r.text
    # TestClient runs background tasks before returning, so the job is already finished
    return client.get(f"{UP}/jobs/{r.json()['id']}", headers=hdr).json()


# ---------------------------------------------------------------- jobs
def test_preview_job_then_commit_without_reupload(client, db, admin_headers):
    seed(db, "CBC")
    prev = run(client, admin_headers, "Test,A(111111)\nCBC,100\n")
    assert prev["status"] == "done" and prev["progress"] == 100
    assert prev["report"]["dry_run"] and count(db, LabTestPrice) == 0

    r = client.post(f"{UP}/jobs/{prev['id']}/commit", headers=admin_headers)
    assert r.status_code == 202
    job = client.get(f"{UP}/jobs/{r.json()['id']}", headers=admin_headers).json()
    assert job["status"] == "done" and job["report"]["committed"]
    assert job["message"] == "Updated 1 prices across 1 branches. 1 new, 0 changed, 0 errors"
    assert count(db, LabTestPrice) == 1


def test_commit_blocked_by_errors_keeps_report(client, db, admin_headers):
    seed(db, "CBC")
    job = run(client, admin_headers, "Test,A(111111),Bad\nCBC,10,5\n", mode="commit")
    assert job["status"] == "failed" and "1 errors" in job["error"]
    assert job["report"]["errors"][0]["column"] == "C"  # report survives the failure
    assert count(db, LabTestPrice) == 0


def test_history_and_undo_restores_and_removes(client, db, admin_headers):
    seed(db, "CBC", "LFT")
    first = run(client, admin_headers, "Test,A(111111)\nCBC,100\nLFT,200\n", mode="commit")
    second = run(client, admin_headers, "Test,A(111111),B(222222)\nCBC,150,90\n", mode="commit")
    assert count(db, LabTestPrice) == 3

    hist = client.get(f"{UP}/jobs", headers=admin_headers).json()
    assert [h["id"] for h in hist] == [second["id"], first["id"]] and hist[0]["can_undo"]
    assert hist[0]["by"] is not None

    r = client.post(f"{UP}/jobs/{second['id']}/undo", headers=admin_headers)
    undo = client.get(f"{UP}/jobs/{r.json()['id']}", headers=admin_headers).json()
    assert undo["status"] == "done"
    assert (undo["report"]["restored"], undo["report"]["removed"], undo["report"]["skipped"]) == (1, 1, 0)
    prices = {
        (t, p) for t, p in db.execute(
            select(Test.name, LabTestPrice.price).join(LabTestPrice, LabTestPrice.test_id == Test.id))
    }
    assert prices == {("CBC", 100.0), ("LFT", 200.0)}  # back to the first upload
    assert db.scalar(select(Lab.id).where(Lab.pin_code == "222222")) is None  # branch created by it is gone
    db.expire_all()
    assert db.get(PriceUploadJob, second["id"]).status == "undone"
    # can't undo twice
    assert client.post(f"{UP}/jobs/{second['id']}/undo", headers=admin_headers).status_code == 400


def test_undo_skips_prices_changed_by_later_upload(client, db, admin_headers):
    seed(db, "CBC")
    first = run(client, admin_headers, "Test,A(111111)\nCBC,100\n", mode="commit")
    run(client, admin_headers, "Test,A(111111)\nCBC,300\n", mode="commit")  # later upload
    r = client.post(f"{UP}/jobs/{first['id']}/undo", headers=admin_headers)
    undo = client.get(f"{UP}/jobs/{r.json()['id']}", headers=admin_headers).json()
    assert undo["report"]["skipped"] == 1
    assert db.scalar(select(LabTestPrice.price)) == 300  # later edit untouched


def test_only_one_write_job_at_a_time(client, db, admin_headers):
    seed(db, "CBC")
    db.add(PriceUploadJob(kind="commit", status="running", filename="x.csv"))
    db.commit()
    r = client.post(f"{UP}/jobs", files=f("Test,A(111111)\nCBC,1\n"), data={"mode": "commit"}, headers=admin_headers)
    assert r.status_code == 409


def test_job_endpoints_admin_only(client, patient_headers):
    assert client.post(f"{UP}/jobs", files=f("a"), headers=patient_headers).status_code == 403
    assert client.get(f"{UP}/jobs", headers=patient_headers).status_code == 403


def test_interrupted_jobs_marked_failed(db, client):
    from app.services.price_upload import jobs

    db.add(PriceUploadJob(kind="commit", status="running", filename="x.csv"))
    db.commit()
    jobs.mark_interrupted_jobs()
    db.expire_all()
    j = db.scalar(select(PriceUploadJob))
    assert j.status == "failed" and "restarted" in j.error


# ---------------------------------------------------------------- price jump warning
def test_big_price_jump_flagged_in_preview(client, db, admin_headers):
    seed(db, "CBC", "LFT")
    run(client, admin_headers, "Test,A(111111)\nCBC,100\nLFT,100\n", mode="commit")
    prev = run(client, admin_headers, "Test,A(111111)\nCBC,1000\nLFT,110\n")
    rep = prev["report"]
    assert rep["summary"]["big_changes"] == 1
    first = rep["preview_rows"][0]
    assert first["test"] == "CBC" and first["warning"] and first["change_pct"] == 900.0


# ---------------------------------------------------------------- aliases + suggestions
def test_unmatched_gets_suggestions_and_alias_fixes_it(client, db, admin_headers):
    seed(db, "CBC", "Lipid Profile")
    body = "Test,A(111111)\nLipid Profil,100\nComplete Blood Count (CBC),50\n"
    prev = run(client, admin_headers, body)
    un = {u["name"]: u for u in prev["report"]["unmatched_tests"]}
    assert [s["name"] for s in un["Lipid Profil"]["suggestions"]][:1] == ["Lipid Profile"]  # typo
    assert "CBC" in [s["name"] for s in un["Complete Blood Count (CBC)"]["suggestions"]]  # contains

    tid = db.scalar(select(Test.id).where(Test.name == "CBC"))
    r = client.post(f"{UP}/aliases", json={"alias": "Complete Blood Count (CBC)", "test_id": tid}, headers=admin_headers)
    assert r.status_code == 201
    again = run(client, admin_headers, body, mode="commit", allow_partial="true")
    assert again["report"]["summary"]["new"] == 1  # alias row saved onto the real CBC test
    assert db.scalar(select(LabTestPrice.test_id)) == tid
    assert count(db, Test) == 2  # no duplicate test created

    # alias can't shadow a real test or point two ways
    assert client.post(f"{UP}/aliases", json={"alias": "lipid profile", "test_id": tid}, headers=admin_headers).status_code == 409
    other = db.scalar(select(Test.id).where(Test.name == "Lipid Profile"))
    assert client.post(f"{UP}/aliases", json={"alias": "Complete Blood Count (CBC)", "test_id": other}, headers=admin_headers).status_code == 409


# ---------------------------------------------------------------- categories
def test_category_stored_filtered_and_editable(client, db, admin_headers):
    run(client, admin_headers, "Test,A(800012)\nTSH,10\nWeird Thing,5\n", mode="commit", auto_create_tests="true")
    cats = {t.name: t.category for t in db.scalars(select(Test))}
    assert cats == {"TSH": "Thyroid", "Weird Thing": "General"}
    tid = db.scalar(select(Test.id).where(Test.name == "Weird Thing"))
    assert client.patch(f"{UP}/tests/{tid}", json={"category": "Cardiac"}, headers=admin_headers).status_code == 200
    d = client.get(f"{P}/compare", params={"pin_code": "800012", "category": "Cardiac"}).json()
    assert [r["test_name"] for r in d["rows"]] == ["Weird Thing"]
    assert client.patch(f"{UP}/tests/{tid}", json={"category": "Nope"}, headers=admin_headers).status_code == 400


def test_migration_adds_column_and_backfills():
    from app.db_migrate import backfill_test_categories, ensure_columns

    eng = create_engine("sqlite://")
    with eng.begin() as c:  # the OLD tests table, before `category` existed
        c.execute(text("CREATE TABLE tests (id VARCHAR(36) PRIMARY KEY, name VARCHAR(500), normalized_name VARCHAR(500))"))
        c.execute(text("INSERT INTO tests VALUES ('1','TSH','tsh'),('2','Misc','misc')"))
    ensure_columns(eng)
    ensure_columns(eng)  # idempotent
    assert "category" in {c["name"] for c in inspect(eng).get_columns("tests")}
    assert backfill_test_categories(eng) == 2
    with eng.connect() as c:
        assert dict(c.execute(text("SELECT name, category FROM tests")).all()) == {"TSH": "Thyroid", "Misc": "General"}


# ---------------------------------------------------------------- distance
PIN_CSV = "pincode,latitude,longitude\n800012,25.5941,85.1376\n800013,25.6100,85.1500\n801503,25.5800,85.6000\n110001,28.6139,77.2090\n"


def test_nearby_uses_real_distance(client, db, admin_headers):
    r = client.post(f"{UP}/pincodes", files=f(PIN_CSV), headers=admin_headers)
    assert r.json() == {"saved": 4, "skipped": 0}
    run(client, admin_headers,
        "Test,Here(800012),Close(800013),SamePrefixFar(801503),Delhi(110001)\nCBC,300,200,100,50\n",
        mode="commit", auto_create_tests="true")
    d = client.get(f"{P}/compare", params={"pin_code": "800012"}).json()
    names = [(b["name"], b["match"]) for b in d["branches"]]
    # 801503 shares "80" but is ~47 km away -> outside the 25 km radius; Delhi is far too
    assert names == [("Here", "exact"), ("Close", "nearby")]
    assert d["branches"][1]["distance_km"] is not None and d["branches"][1]["distance_km"] < 5
    assert d["branches"][0]["last_updated"]


def test_nearby_falls_back_to_prefix_when_coords_unknown(client, db, admin_headers):
    run(client, admin_headers, "Test,Here(800012),Other(800099),Far(110001)\nCBC,3,2,1\n",
        mode="commit", auto_create_tests="true")
    d = client.get(f"{P}/compare", params={"pin_code": "800012"}).json()  # geocoder patched to fail
    assert [b["name"] for b in d["branches"]] == ["Here", "Other"]


def test_search_orders_exact_then_price_within_radius(client, db, admin_headers):
    client.post(f"{UP}/pincodes", files=f(PIN_CSV), headers=admin_headers)
    run(client, admin_headers, "Test,Pricey(800012),Cheap(800012),Close(800013),Delhi(110001)\nCBC,500,300,100,10\n",
        mode="commit", auto_create_tests="true")
    d = client.get(f"{P}/search", params={"test": "cbc", "pin_code": "800012"}).json()
    assert [(r["lab_name"], r["match"]) for r in d["results"]] == [
        ("Cheap", "exact"), ("Pricey", "exact"), ("Close", "nearby")]


def test_new_branch_pins_get_geocoded_after_upload(client, db, admin_headers, monkeypatch):
    from app.models.lab_price import PincodeGeo
    from app.services import pincode_geo

    monkeypatch.setattr(pincode_geo, "geocode_pin_remote", lambda pin: (25.0, 85.0))
    run(client, admin_headers, "Test,A(800012),B(800013)\nCBC,1,2\n", mode="commit", auto_create_tests="true")
    assert {g.pin_code for g in db.scalars(select(PincodeGeo)) if g.lat} == {"800012", "800013"}


def test_pincode_import_validation(client, admin_headers):
    bad = "pincode,latitude,longitude\n80001,25,85\n800012,99,85\n800013,25.6,85.1\n"
    assert client.post(f"{UP}/pincodes", files=f(bad), headers=admin_headers).json() == {"saved": 1, "skipped": 2}
    assert client.post(f"{UP}/pincodes", files=f("a,b\n1,2\n"), headers=admin_headers).status_code == 400


# ---------------------------------------------------------------- geocoder helpers
def test_google_geocoder_response_parsing():
    from app.routes.geo import google_to_address
    from app.services.pincode_geo import parse_geocode_response

    g = {"results": [{"address_components": [
        {"long_name": "800012", "types": ["postal_code"]},
        {"long_name": "Kankarbagh", "types": ["sublocality", "sublocality_level_1"]},
        {"long_name": "Patna", "types": ["locality"]},
        {"long_name": "Bihar", "types": ["administrative_area_level_1"]}]}]}
    assert google_to_address(g)["address"] == {
        "postcode": "800012", "suburb": "Kankarbagh", "city": "Patna", "state": "Bihar"}
    assert parse_geocode_response({"results": [{"geometry": {"location": {"lat": 1.5, "lng": 2.5}}}]}) == (1.5, 2.5)
    assert parse_geocode_response([{"lat": "25.6", "lon": "85.1"}]) == (25.6, 85.1)
    assert parse_geocode_response([]) is None


# ---------------------------------------------------------------- rate limiting
def test_rate_limit_on_public_endpoints(client):
    for _ in range(20):
        assert client.get("/api/v1/geo/reverse", params={"lat": 500, "lon": 1}).status_code == 422
    r = client.get("/api/v1/geo/reverse", params={"lat": 500, "lon": 1})
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_rate_limit_can_be_disabled(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    for _ in range(30):
        assert client.get("/api/v1/geo/reverse", params={"lat": 500, "lon": 1}).status_code == 422
