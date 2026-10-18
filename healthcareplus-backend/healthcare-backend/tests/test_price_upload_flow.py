from sqlalchemy import func, select

from app.models.lab_price import Lab, LabTestPrice, Test

BASE = "/api/v1/price-uploads"
HDR = "Test Name,Apollo(800012),Apollo(800013),Lal PathLabs(110001)\n"


def files(text: str, name: str = "p.csv"):
    return {"file": (name, text.encode(), "text/csv")}


def seed_tests(db, *names):
    from app.services.price_upload.parser import normalize_name

    for n in names:
        db.add(Test(name=n, normalized_name=normalize_name(n)))
    db.commit()


def count(db, model):
    return db.scalar(select(func.count()).select_from(model))


def test_admin_only(client, patient_headers):
    r = client.post(f"{BASE}/preview", files=files(HDR), headers=patient_headers)
    assert r.status_code == 403
    r = client.post(f"{BASE}/preview", files=files(HDR))
    assert r.status_code == 401


def test_rejects_wrong_extension_and_big_file(client, admin_headers, monkeypatch):
    r = client.post(f"{BASE}/preview", files=files(HDR, "p.xls"), headers=admin_headers)
    assert r.status_code == 400
    from app.core.config import settings

    monkeypatch.setattr(settings, "PRICE_UPLOAD_MAX_MB", 0)
    r = client.post(f"{BASE}/preview", files=files(HDR + "CBC,1,2,3\n"), headers=admin_headers)
    assert r.status_code == 413


def test_preview_writes_nothing_and_lists_unmatched(client, db, admin_headers):
    seed_tests(db, "CBC")
    body = HDR + "cbc,350,380,300\nLipid Profile,600,,550\n"
    r = client.post(f"{BASE}/preview", files=files(body), headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    assert d["dry_run"] and not d["committed"]
    assert d["summary"]["new"] == 3 and d["summary"]["new_branches"] == 3
    assert [u["name"] for u in d["unmatched_tests"]] == ["Lipid Profile"]
    assert count(db, Lab) == 0 and count(db, LabTestPrice) == 0


def test_commit_then_reupload_updates_not_duplicates(client, db, admin_headers):
    seed_tests(db, "CBC", "Lipid Profile")
    body = HDR + "CBC,350,380,300\nLipid Profile,600,,550\n"
    r = client.post(f"{BASE}/commit", files=files(body), headers=admin_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["committed"] and d["summary"]["new"] == 5
    assert d["message"] == "Updated 5 prices across 3 branches. 5 new, 0 changed, 0 errors"
    assert count(db, LabTestPrice) == 5

    # re-upload: only Apollo(800012) column, one price changed
    body2 = "Test Name,Apollo(800012)\nCBC,400\nLipid Profile,600\n"
    r = client.post(f"{BASE}/commit", files=files(body2), headers=admin_headers)
    d = r.json()
    assert d["summary"]["changed"] == 1 and d["summary"]["unchanged"] == 1
    assert d["message"].startswith("Updated 1 prices across 1 branches. 0 new, 1 changed")
    assert count(db, LabTestPrice) == 5 and count(db, Lab) == 3

    # other branches untouched
    other = db.scalar(
        select(LabTestPrice.price).join(Lab).join(Test).where(
            Lab.pin_code == "800013", Test.normalized_name == "cbc")
    )
    assert other == 380


def test_errors_block_commit_unless_partial(client, db, admin_headers):
    seed_tests(db, "CBC", "LFT")
    body = "Test,A(111111),Bad\nCBC,10,5\nLFT,abc,7\n"
    r = client.post(f"{BASE}/commit", files=files(body), headers=admin_headers)
    assert r.status_code == 422
    assert count(db, LabTestPrice) == 0  # nothing saved

    r = client.post(f"{BASE}/commit", files=files(body), data={"allow_partial": "true"},
                    headers=admin_headers)
    d = r.json()
    assert r.status_code == 200 and d["summary"]["errors"] == 2 and d["summary"]["new"] == 1
    assert {(e["row"], e["column"]) for e in d["errors"]} == {(1, "C"), (3, "B")}


def test_auto_create_tests_toggle(client, db, admin_headers):
    body = "Test,A(111111)\nNew Test,10\n"
    r = client.post(f"{BASE}/commit", files=files(body), headers=admin_headers)
    assert r.json()["summary"]["unmatched_tests"] == 1 and count(db, Test) == 0
    r = client.post(f"{BASE}/commit", files=files(body), data={"auto_create_tests": "true"},
                    headers=admin_headers)
    assert r.json()["summary"]["new_tests"] == 1 and count(db, Test) == 1


def test_long_format_same_backend(client, db, admin_headers):
    long_csv = "lab_name,pin_code,test_name,price\nApollo,800012,CBC,350\nApollo,800013,CBC,380\n"
    r = client.post(f"{BASE}/commit", files=files(long_csv),
                    data={"auto_create_tests": "true"}, headers=admin_headers)
    d = r.json()
    assert d["layout"] == "long" and d["summary"]["new"] == 2


def test_transaction_rolls_back_on_failure(client, db, admin_headers, monkeypatch):
    from app.services.price_upload import service

    real = service.commit_plan

    def boom(db_, parsed, plan):
        real(db_, parsed, plan)  # writes labs + prices...
        raise RuntimeError("disk full")  # ...then dies

    monkeypatch.setattr("app.routes.price_upload.commit_plan", boom)
    body = "Test,A(111111)\nCBC,10\n"
    r = client.post(f"{BASE}/commit", files=files(body), data={"auto_create_tests": "true"},
                    headers=admin_headers)
    assert r.status_code == 500
    assert count(db, Lab) == 0 and count(db, LabTestPrice) == 0 and count(db, Test) == 0


def test_search_exact_then_nearby_sorted_by_price(client, db, admin_headers):
    body = (
        "Test,Apollo(800012),Metro(800012),Cheap(800099),Far(110001)\n"
        "CBC,350,300,100,50\n"
    )
    client.post(f"{BASE}/commit", files=files(body), data={"auto_create_tests": "true"},
                headers=admin_headers)
    r = client.get("/api/v1/prices/search", params={"test": "cbc", "pin_code": "800012"})
    got = [(x["lab_name"], x["match"]) for x in r.json()["results"]]
    assert got == [("Metro", "exact"), ("Apollo", "exact"), ("Cheap", "nearby")]  # Far excluded
    r = client.get("/api/v1/prices/search", params={"test": "cbc"})
    assert [x["lab_name"] for x in r.json()["results"]] == ["Far", "Cheap", "Metro", "Apollo"]
    assert client.get("/api/v1/prices/search", params={"test": "cbc", "pin_code": "12"}).status_code == 400
    assert client.get("/api/v1/prices/tests", params={"q": "CB"}).json()[0]["name"] == "CBC"


def test_master_test_list_import(client, db, admin_headers, patient_headers):
    body = "Test Name\nCBC\n  cbc \nLipid   Profile\n\nHbA1c\n"
    r = client.post(f"{BASE}/tests", files=files(body), data={"dry_run": "true"}, headers=admin_headers)
    d = r.json()
    assert d["added"] == 3 and d["duplicates_in_file"] == 1 and d["blank_rows"] == 0 or d["blank_rows"] == 1
    assert count(db, Test) == 0  # dry run wrote nothing
    r = client.post(f"{BASE}/tests", files=files(body), headers=admin_headers)
    assert r.json()["added"] == 3 and count(db, Test) == 3
    r = client.post(f"{BASE}/tests", files=files(body + "New One\n"), headers=admin_headers)
    d = r.json()
    assert d["added"] == 1 and d["already_existed"] == 3 and count(db, Test) == 4
    assert client.post(f"{BASE}/tests", files=files(body), headers=patient_headers).status_code == 403
