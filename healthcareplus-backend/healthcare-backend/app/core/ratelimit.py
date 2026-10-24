"""Small in-memory sliding-window rate limiter for PUBLIC endpoints.

Per process: with several workers each one counts separately (limits become
N x higher). Swap the store for Redis if you need exact limits.
Behind a reverse proxy, make sure uvicorn gets --proxy-headers so
request.client.host is the real visitor and not the proxy.
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import settings

_HITS: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_LOCK = Lock()


def reset_rate_limits() -> None:
    with _LOCK:
        _HITS.clear()


def rate_limit(name: str, max_calls: int, per_seconds: int = 60):
    """FastAPI dependency: `Depends(rate_limit("geo", 20))` = 20 calls/min per IP."""

    def dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        key = (name, ip)
        with _LOCK:
            q = _HITS[key]
            while q and now - q[0] > per_seconds:
                q.popleft()
            if len(q) >= max_calls:
                retry = max(1, int(per_seconds - (now - q[0])))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests. Please wait a moment and try again.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)

    return dependency
