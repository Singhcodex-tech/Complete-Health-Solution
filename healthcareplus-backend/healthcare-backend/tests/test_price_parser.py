import pytest

from app.services.price_upload.parser import (
    FileFormatError,
    normalize_name,
    parse_file,
    parse_header,
    parse_price,
)


# ---- header parsing ----
@pytest.mark.parametrize(
    "header,expected",
    [
        ("Apollo(800012)", ("Apollo", "800012")),
        ("Apollo (800012)", ("Apollo", "800012")),
        ("  Lal PathLabs  ( 110001 )".replace("( ", "(").replace(" )", ")"), ("Lal PathLabs", "110001")),
        ("Dr. Lal's Lab (000123)", ("Dr. Lal's Lab", "000123")),  # leading zeros kept, string
        ("Apollo (Patna) (800012)", ("Apollo (Patna)", "800012")),
    ],
)
def test_valid_headers(header, expected):
    assert parse_header(header) == expected


@pytest.mark.parametrize(
    "header",
    ["Apollo", "Apollo(800012", "Apollo800012)", "Apollo(80001)", "Apollo(8000123)",
     "Apollo(80001a)", "Apollo(abcdef)", "(800012)", "", None, "Apollo()"],
)
def test_invalid_headers(header):
    assert parse_header(header) is None


def test_pin_is_string():
    assert isinstance(parse_header("X(012345)")[1], str)


def test_normalize_name():
    assert normalize_name("  Lipid   PROFILE ") == "lipid profile"


# ---- price validation ----
@pytest.mark.parametrize("v,exp", [(350, 350.0), ("350", 350.0), ("1,250.50", 1250.5), (99.999, 100.0)])
def test_good_prices(v, exp):
    assert parse_price(v) == (exp, None)


@pytest.mark.parametrize("v", [0, -5, "abc", "12abc", "nan", "inf", True, 10**9, "0", "-1"])
def test_bad_prices(v):
    price, reason = parse_price(v)
    assert price is None and reason


# ---- wide file ----
def csv_bytes(text: str) -> bytes:
    return text.strip().encode()


WIDE = """
Test Name,Apollo(800012),Apollo (800013),Lal PathLabs(110001)
CBC,350,380,300
Lipid Profile,600,,550
"""


def test_wide_happy_path():
    p = parse_file("f.csv", csv_bytes(WIDE))
    assert p.layout == "wide" and not p.errors
    assert p.branch_count == 3
    assert len(p.records) == 5  # blank cell skipped
    r = next(x for x in p.records if x.test_name == "Lipid Profile" and x.pin_code == "800012")
    assert r.price == 600 and r.lab_name == "Apollo"
    assert all(isinstance(x.pin_code, str) for x in p.records)


def test_wide_bad_headers_report_exact_column():
    text = "Test,Apollo(800012),Metro 110001,Lab(12345),Lab(12345a)\nCBC,1,2,3,4\n"
    p = parse_file("f.csv", text.encode())
    cols = {(e.row, e.column) for e in p.errors}
    assert cols == {(1, "C"), (1, "D"), (1, "E")}
    assert len(p.records) == 1  # only the valid column parsed


def test_wide_duplicate_branch_columns():
    text = "Test,Apollo(800012),apollo (800012)\nCBC,1,2\n"
    p = parse_file("f.csv", text.encode())
    assert [(e.row, e.column) for e in p.errors] == [(1, "C")]
    assert "Duplicate" in p.errors[0].reason
    assert len(p.records) == 1 and p.records[0].price == 1


def test_wide_bad_prices_row_and_column():
    text = "Test,A(111111),B(222222)\nCBC,abc,0\nLFT,-4,50\n"
    p = parse_file("f.csv", text.encode())
    assert {(e.row, e.column) for e in p.errors} == {(2, "B"), (2, "C"), (3, "B")}
    assert len(p.records) == 1 and p.records[0].test_name == "LFT"


def test_wide_missing_test_name_and_duplicate_test():
    text = "Test,A(111111)\n,5\nCBC,1\n cbc ,2\n"
    p = parse_file("f.csv", text.encode())
    reasons = {(e.row, e.column) for e in p.errors}
    assert reasons == {(2, "A"), (4, "A")}
    assert len(p.records) == 1


def test_blank_rows_and_empty_file():
    p = parse_file("f.csv", b"Test,A(111111)\n\n,\nCBC,1\n")
    assert len(p.records) == 1 and not p.errors
    with pytest.raises(FileFormatError):
        parse_file("f.csv", b"")
    with pytest.raises(FileFormatError):
        parse_file("f.pdf", b"x")


# ---- long file ----
LONG = """
lab_name,pin_code,test_name,price
Apollo,800012,CBC,350
Apollo,800013,CBC,380
Apollo,800012,CBC,999
Metro,11000,CBC,10
Metro,110001,,10
Metro,110001,LFT,zero
"""


def test_long_format():
    p = parse_file("f.csv", csv_bytes(LONG))
    assert p.layout == "long"
    assert len(p.records) == 2
    errs = {(e.row, e.column) for e in p.errors}
    assert errs == {(4, "D"), (5, "B"), (6, "C"), (7, "D")}
    assert p.branch_count == 2


def test_long_excel_float_pin_ok():
    from app.services.price_upload.parser import parse_long

    p = parse_long([["lab_name", "pin_code", "test_name", "price"], ["A", 800012.0, "CBC", 5]])
    assert p.records[0].pin_code == "800012"


def test_xlsx_roundtrip():
    import io

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["Test Name", "Apollo(800012)", "Metro(110001)"])
    ws.append(["CBC", 350, None])
    buf = io.BytesIO()
    wb.save(buf)
    p = parse_file("f.xlsx", buf.getvalue())
    assert len(p.records) == 1 and p.records[0].price == 350
