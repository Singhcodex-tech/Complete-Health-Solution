"""Which lab branches serve a pin code: by real distance when we know coordinates,
else falling back to 'same first 3 digits'."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lab_price import Lab, PincodeGeo
from app.services.pincode_geo import bounding_box, get_coords, haversine_km


@dataclass
class NearbyLab:
    id: str
    name: str
    pin_code: str
    match: str  # exact | nearby
    distance_km: float | None


def nearby_labs(db: Session, pin: str, limit: int = 60, radius_km: float | None = None) -> list[NearbyLab]:
    radius = radius_km or settings.NEARBY_RADIUS_KM
    origin = get_coords(db, pin)  # at most one provider call, then cached
    out: dict[str, NearbyLab] = {}

    # exact pin always counts, whatever the geocoder says
    for lid, name, lpin in db.execute(select(Lab.id, Lab.name, Lab.pin_code).where(Lab.pin_code == pin)):
        out[lid] = NearbyLab(lid, name, lpin, "exact", 0.0 if origin else None)

    if origin:
        s, n, w, e = bounding_box(origin[0], origin[1], radius)
        rows = db.execute(
            select(Lab.id, Lab.name, Lab.pin_code, PincodeGeo.lat, PincodeGeo.lon)
            .join(PincodeGeo, PincodeGeo.pin_code == Lab.pin_code)
            .where(PincodeGeo.lat.between(s, n), PincodeGeo.lon.between(w, e), Lab.pin_code != pin)
        ).all()
        for lid, name, lpin, lat, lon in rows:
            d = haversine_km(origin[0], origin[1], lat, lon)
            if d <= radius:
                out[lid] = NearbyLab(lid, name, lpin, "nearby", round(d, 1))
        # branches whose pin we couldn't place on the map: keep the old 3-digit rule for them only
        unplaced = db.execute(
            select(Lab.id, Lab.name, Lab.pin_code)
            .outerjoin(PincodeGeo, PincodeGeo.pin_code == Lab.pin_code)
            .where(Lab.pin_code.like(pin[:3] + "%"), Lab.pin_code != pin)
            .where(or_(PincodeGeo.pin_code.is_(None), PincodeGeo.lat.is_(None)))
        ).all()
        for lid, name, lpin in unplaced:
            out.setdefault(lid, NearbyLab(lid, name, lpin, "nearby", None))
    else:
        for lid, name, lpin in db.execute(
            select(Lab.id, Lab.name, Lab.pin_code).where(Lab.pin_code.like(pin[:3] + "%"), Lab.pin_code != pin)
        ):
            out[lid] = NearbyLab(lid, name, lpin, "nearby", None)

    ranked = sorted(
        out.values(),
        key=lambda x: (x.match != "exact", x.distance_km if x.distance_km is not None else 9999.0, x.name),
    )
    return ranked[:limit]
