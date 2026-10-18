"""GPS -> pin code. Server-side so we can set a proper User-Agent, cache, and swap provider later."""
import json
import re
import threading
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.schemas.price_upload import ReverseGeoOut

router = APIRouter(prefix="/geo", tags=["Geo"])

_CACHE: dict[tuple[float, float], dict] = {}
_LOCK = threading.Lock()
_CACHE_MAX = 5000
_PIN_RE = re.compile(r"(?<!\d)(\d{3})\s?(\d{3})(?!\d)")


def _fetch(lat: float, lon: float) -> dict:
    qs = urllib.parse.urlencode(
        {"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 18, "addressdetails": 1, "accept-language": "en"}
    )
    req = urllib.request.Request(
        f"{settings.GEOCODER_URL}?{qs}", headers={"User-Agent": settings.GEOCODER_USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=6) as resp:  # noqa: S310 - fixed https URL from settings
        return json.loads(resp.read().decode())


@router.get("/reverse", response_model=ReverseGeoOut)
def reverse_geocode(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
) -> ReverseGeoOut:
    key = (round(lat, 3), round(lon, 3))  # ~100 m cells -> cache hits for nearby users
    with _LOCK:
        hit = _CACHE.get(key)
    if hit is None:
        try:
            hit = _fetch(lat, lon)
        except (urllib.error.URLError, TimeoutError, ValueError):
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Location service is unavailable right now. Please enter your pin code instead.",
            )
        with _LOCK:
            if len(_CACHE) >= _CACHE_MAX:
                _CACHE.pop(next(iter(_CACHE)))
            _CACHE[key] = hit

    addr = hit.get("address") or {}
    m = _PIN_RE.search(str(addr.get("postcode", "")))
    if not m:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Couldn't work out a pin code for this spot. Please enter it manually.",
        )
    return ReverseGeoOut(
        pin_code=m.group(1) + m.group(2),
        area=addr.get("suburb") or addr.get("neighbourhood") or addr.get("village"),
        city=addr.get("city") or addr.get("town") or addr.get("state_district") or addr.get("county"),
        state=addr.get("state"),
    )
