"""Cached HTTP with limited retries. Never bypass access controls."""

from __future__ import annotations

import email.utils
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from common import CACHE_DIR, USER_AGENT, sha256_bytes, utc_now_iso


class FetchError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None, url: str | None = None):
        super().__init__(message)
        self.status = status
        self.url = url


def _cache_key(method: str, url: str, body: bytes | None) -> str:
    h = hashlib.sha256()
    h.update(method.encode())
    h.update(b"\0")
    h.update(url.encode())
    h.update(b"\0")
    h.update(body or b"")
    return h.hexdigest()


def fetch(
    url: str,
    *,
    method: str = "GET",
    data: dict[str, str] | bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 60,
        retries: int = 5,
    cache: bool = True,
    min_interval_s: float = 1.2,
    referer: str | None = None,
    cookie_file: Path | None = None,
) -> dict[str, Any]:
    """
    Fetch URL with on-disk cache. Returns dict with path, sha256, status, headers, fetched_at.
    Binary and text responses are stored as raw bytes in cache.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if isinstance(data, dict):
        body = urllib.parse.urlencode(data).encode("utf-8")
        content_type = "application/x-www-form-urlencoded"
    elif isinstance(data, bytes):
        body = data
        content_type = None
    else:
        body = None
        content_type = None

    key = _cache_key(method, url, body)
    raw_path = CACHE_DIR / f"{key}.bin"
    meta_path = CACHE_DIR / f"{key}.json"

    if cache and raw_path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["cache_hit"] = True
        meta["path"] = str(raw_path)
        return meta

    req_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }
    if referer:
        req_headers["Referer"] = referer
    if content_type:
        req_headers["Content-Type"] = content_type
    if headers:
        req_headers.update(headers)

    last_error: Exception | None = None
    for attempt in range(retries):
        if attempt:
            time.sleep(min(16, 2 ** attempt))
        try:
            time.sleep(min_interval_s)
            request = urllib.request.Request(url, data=body, headers=req_headers, method=method)
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
            with opener.open(request, timeout=timeout) as resp:
                payload = resp.read()
                status = getattr(resp, "status", 200)
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            if status >= 400:
                raise FetchError(f"HTTP {status} for {url}", status=status, url=url)
            meta = {
                "url": url,
                "final_url": url,
                "method": method,
                "status": status,
                "headers": resp_headers,
                "bytes": len(payload),
                "sha256": sha256_bytes(payload),
                "fetched_at": utc_now_iso(),
                "cache_hit": False,
                "path": str(raw_path),
                "content_type": resp_headers.get("content-type"),
                "content_disposition": resp_headers.get("content-disposition"),
            }
            raw_path.write_bytes(payload)
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            return meta
        except urllib.error.HTTPError as exc:
            last_error = FetchError(f"HTTP {exc.code} for {url}: {exc.reason}", status=exc.code, url=url)
            if exc.code in {401, 403, 404}:
                break
        except urllib.error.URLError as exc:
            last_error = FetchError(f"URL error for {url}: {exc.reason}", url=url)
        except FetchError as exc:
            last_error = exc
            if exc.status in {401, 403, 404}:
                break
        except (TimeoutError, ConnectionError, OSError) as exc:
            last_error = FetchError(f"connection error for {url}: {exc}", url=url)
    assert last_error is not None
    raise last_error


def cache_text(meta: dict[str, Any], encoding: str = "utf-8") -> str:
    return Path(meta["path"]).read_bytes().decode(encoding, errors="replace")


def format_http_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return email.utils.parsedate_to_datetime(value).astimezone().isoformat()
    except (TypeError, ValueError):
        return value
