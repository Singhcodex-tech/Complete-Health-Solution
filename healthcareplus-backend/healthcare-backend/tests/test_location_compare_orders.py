import pytest
from sqlalchemy import select

from app.models.lab import LabCompany
from app.models.lab_price import Lab, Test
from app.models.order import Order, OrderLabDropoff

UP = "/api/v1/price-uploads"
P = "/api/v1/prices"

MATRIX = (
    "Test Name,Apollo(800012),Metro(800012),Cheap(800099),Far(110001)\n"
    "CBC,350,300,100,50\n"
    "Lipid Profile,600,,550,\n"
    "TSH,200,210,,\n"
    "HbA1c,400,,,\n"
)


@pytest.fixture()
def loaded(client, admin_headers):
    r = client.post(f"{UP}/commit", files={"file": ("m.csv", MATRIX.encode(), "text/csv")},
                    data={"auto_create_tests": "true"}, headers=admin_headers)
    assert r.status_code == 200, r.text


def test_compare_columns_exact_first_and_rows(client, loaded):
    d = client.get(f"{P}/compare", params={"pin_code": "800012"}).json()
    assert [(b["name"], b["match"]) for b in d["branches"]] == [
        ("Apollo", "exact"), ("Metro", "exact"), ("Cheap", "nearby")]  # Far (110001) excluded
    assert d["total_tests"] == 4
    cbc = next(r for r in d["rows"] if r["test_name"] == "CBC")
    ids = {b["name"]: b["id"] for b in d["branches"]}
    assert cbc["prices"] == {ids["Apollo"]: 350, ids["Metro"]: 300, ids["Cheap"]: 100}
    lipid = next(r for r in d["rows"] if r["test_name"] == "Lipid Profile")
    assert ids["Metro"] not in lipid["prices"]  # blank cell = not offered


def test_compare_search_category_paging(client, loaded):
    g = lambda **k: client.get(f"{P}/compare", params={"pin_code": "800012", **k}).json()
    assert [r["test_name"] for r in g(q="lipid")["rows"]] == ["Lipid Profile"]
    assert {r["test_name"] for r in g(category="Thyroid")["rows"]} == {"TSH"}
    assert {r["test_name"] for r in g(category="Diabetes")["rows"]} == {"HbA1c"}
    p1 = g(page_size=2)
    assert len(p1["rows"]) == 2 and p1["total_tests"] == 4
    assert g(page_size=2, page=2)["rows"][0]["test_name"] != p1["rows"][0]["test_name"]
    assert client.get(f"{P}/compare", params={"pin_code": "800012", "category": "Nope"}).status_code == 400
    assert client.get(f"{P}/compare", params={"pin_code": "12"}).status_code == 400


def test_compare_no_labs_in_area(client, loaded):
    d = client.get(f"{P}/compare", params={"pin_code": "560001"}).json()
    assert d["branches"] == [] and d["rows"] == []


# ---- geo ----
def test_reverse_geocode(client, monkeypatch):
    from app.routes import geo

    geo._CACHE.clear()
    calls = []

    def fake(lat, lon):
        calls.append(1)
        return {"address": {"postcode": "800 012", "suburb": "Kankarbagh", "city": "Patna", "state": "Bihar"}}

    monkeypatch.setattr(geo, "_fetch", fake)
    d = client.get("/api/v1/geo/reverse", params={"lat": 25.5941, "lon": 85.1376}).json()
    assert d == {"pin_code": "800012", "area": "Kankarbagh", "city": "Patna", "state": "Bihar"}
    client.get("/api/v1/geo/reverse", params={"lat": 25.5942, "lon": 85.1377})
    assert len(calls) == 1  # same ~100m cell -> cached


def test_reverse_geocode_failures(client, monkeypatch):
    import urllib.error

    from app.routes import geo

    geo._CACHE.clear()
    monkeypatch.setattr(geo, "_fetch", lambda a, b: {"address": {"city": "X"}})
    assert client.get("/api/v1/geo/reverse", params={"lat": 1, "lon": 1}).status_code == 404

    def boom(a, b):
        raise urllib.error.URLError("down")

    geo._CACHE.clear()
    monkeypatch.setattr(geo, "_fetch", boom)
    assert client.get("/api/v1/geo/reverse", params={"lat": 2, "lon": 2}).status_code == 502
    assert client.get("/api/v1/geo/reverse", params={"lat": 999, "lon": 2}).status_code == 422


# ---- ordering from branch prices ----
def test_order_from_branch_prices(client, db, loaded, patient_with_profile, monkeypatch):
    monkeypatch.setattr("app.routes.orders.send_sms", lambda *a, **k: None)
    d = client.get(f"{P}/compare", params={"pin_code": "800012"}).json()
    ids = {b["name"]: b["id"] for b in d["branches"]}
    t = {r["test_name"]: r["test_id"] for r in d["rows"]}
    body = {
        "branch_items": [
            {"lab_id": ids["Apollo"], "test_id": t["CBC"]},
            {"lab_id": ids["Metro"], "test_id": t["CBC"]},
            {"lab_id": ids["Apollo"], "test_id": t["CBC"]},  # duplicate ignored
        ],
        "pickup_address": "12 Kankarbagh, Patna 800012",
        "pickup_date": "2030-01-01",
        "pickup_time": "09:00:00",
    }
    r = client.post("/api/v1/orders/", json=body, headers=patient_with_profile)
    assert r.status_code == 201, r.text
    o = r.json()
    assert o["total_amount"] == 650
    assert sorted(i["lab_company_name"] for i in o["items"]) == ["Apollo (800012)", "Metro (800012)"]
    assert len(o["lab_dropoffs"]) == 2  # rider verifies at each branch

    # mirrors are hidden from the legacy public list
    assert client.get("/api/v1/labs/").json() == []
    assert db.scalar(select(LabCompany).limit(1)) is not None


def test_order_rejects_unpriced_pair_and_empty(client, loaded, patient_with_profile, db, monkeypatch):
    monkeypatch.setattr("app.routes.orders.send_sms", lambda *a, **k: None)
    d = client.get(f"{P}/compare", params={"pin_code": "800012"}).json()
    ids = {b["name"]: b["id"] for b in d["branches"]}
    t = {r["test_name"]: r["test_id"] for r in d["rows"]}
    base = {"pickup_address": "12 Kankarbagh, Patna", "pickup_date": "2030-01-01", "pickup_time": "09:00:00"}
    # Metro does not offer Lipid Profile
    r = client.post("/api/v1/orders/", json={**base, "branch_items": [
        {"lab_id": ids["Metro"], "test_id": t["Lipid Profile"]}]}, headers=patient_with_profile)
    assert r.status_code == 400
    r = client.post("/api/v1/orders/", json=base, headers=patient_with_profile)
    assert r.status_code == 422
    assert db.scalar(select(Order).limit(1)) is None
