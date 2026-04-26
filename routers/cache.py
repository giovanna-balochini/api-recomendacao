from __future__ import annotations

import time
from typing import Any

_STORE: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    entry = _STORE.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if expires_at < time.time():
        _STORE.pop(key, None)
        return None
    return value


def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    _STORE[key] = (time.time() + ttl_seconds, value)


def cache_clear() -> None:
    _STORE.clear()
