"""Pin code -> coordinates (cached in `pincode_geo`) and real distance helpers."""
from __future__ import annotations

import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lab_price import PincodeGeo

RETRY_FAILED_AFTER = timedelta(hours=24)
PIN_RE = re.compile(r"^[0-9]{6}$")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bounding_box(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(0.01, math.cos(math.radians(lat))))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


# ---- provider call (monkeypatched in tests) ----
def geocode_pin_remote(pin: str) -> tuple[float, float] | None:
    """Ask the configured geocoder for the centre of an Indian pin code."""
    if settings.GEOCODER_PROVIDER == "google" and settings.GOOGLE_MAPS_API_KEY:
        qs = urllib.parse.urlencode(
            {"address": pin, "components": f"country:IN|postal_code:{pin}", "key": settings.GOOGLE_MAPS_API_KEY}
        )
        url = f"https://maps.googleapis.com/maps/api/geocode/json?{qs}"
        headers: dict[str, str] = {}
    else:
        base = settings.GEOCODER_URL.replace("/reverse", "/search")
        qs = urllib.parse.urlencode({"postalcode": pin, "country": "India", "format": "jsonv2", "limit": 1})
        url = f"{base}?{qs}"
        headers = {"User-Agent": settings.GEOCODER_USER_AGENT}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:  # noqa: S310 - fixed https URL
            data = json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    return parse_geocode_response(data)


def parse_geocode_response(data) -> tuple[float, float] | None:
    try:
        if isinstance(data, dict):  # Google
            loc = data["results"][0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"])
        return float(data[0]["lat"]), float(data[0]["lon"])  # Nominatim
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def _fresh_failure(row: PincodeGeo) -> bool:
    return row.lat is None and datetime.now(timezone.utc).replace(tzinfo=None) - row.updated_at < RETRY_FAILED_AFTER


def get_coords(db: Session, pin: str, allow_network: bool = True) -> tuple[float, float] | None:
    row = db.get(PincodeGeo, pin)
    if row is not None and (row.lat is not None or _fresh_failure(row)):
        return (row.lat, row.lon) if row.lat is not None else None
    if not allow_network:
        return None
    found = geocode_pin_remote(pin)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if row is None:
        row = PincodeGeo(pin_code=pin)
        db.add(row)
    row.lat, row.lon = (found if found else (None, None))
    row.updated_at = now
    db.commit()
    return found


def geocode_missing_pins(db: Session, pins: list[str], progress=None) -> tuple[int, int]:
    """Background helper: fill the cache for pins we've never looked up. Returns (found, failed)."""
    todo = []
    for pin in sorted(set(pins)):
        row = db.get(PincodeGeo, pin)
        if row is None or (row.lat is None and not _fresh_failure(row)):
            todo.append(pin)
    found = failed = 0
    for i, pin in enumerate(todo):
        if get_coords(db, pin) is not None:
            found += 1
        else:
            failed += 1
        if settings.GEOCODER_PROVIDER != "google":
            time.sleep(1.1)  # Nominatim usage policy: max 1 request/second
        if progress:
            progress(i + 1, len(todo))
    return found, failed


def import_pincode_rows(db: Session, rows: list[list]) -> tuple[int, int]:
    """CSV/XLSX rows with columns pin(code), lat(itude), lon/lng/long(itude). Returns (saved, skipped)."""
    if not rows:
        return 0, 0
    head = [str(c or "").strip().lower() for c in rows[0]]

    def col(*names):
        for n in names:
            if n in head:
                return head.index(n)
        return None

    ip = col("pin_code", "pincode", "pin")
    ila = col("latitude", "lat")
    ilo = col("longitude", "lng", "lon", "long")
    if None in (ip, ila, ilo):
        raise ValueError("Need columns: pincode, latitude, longitude")
    saved = skipped = 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    existing = {p.pin_code: p for p in db.scalars(select(PincodeGeo))}
    for r in rows[1:]:
        try:
            pin = str(int(float(r[ip]))) if isinstance(r[ip], float) else str(r[ip]).strip()
            lat, lon = float(r[ila]), float(r[ilo])
        except (TypeError, ValueError, IndexError):
            skipped += 1
            continue
        if not PIN_RE.match(pin) or not (6 <= lat <= 38 and 67 <= lon <= 98):  # India's bounding box
            skipped += 1
            continue
        row = existing.get(pin)
        if row is None:
            row = existing[pin] = PincodeGeo(pin_code=pin)
            db.add(row)
        row.lat, row.lon, row.source, row.updated_at = lat, lon, "import", now
        saved += 1
    db.commit()
    return saved, skipped
