"""Persistent human/AI review overlays. Re-runs must not clobber these rows."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from common import RESEARCH_DIR, utc_now_iso

OVERLAY_PATH = RESEARCH_DIR / "overlays" / "reviews.jsonl"


def load_overlays(path: Path | None = None) -> list[dict[str, Any]]:
    path = path or OVERLAY_PATH
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def save_overlays(rows: list[dict[str, Any]], path: Path | None = None) -> None:
    path = path or OVERLAY_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def merge_overlay_records(existing: list[dict[str, Any]], incoming: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Overlay records are keyed by (id, field). Incoming never deletes existing.
    Same key is updated only when incoming.revision >= existing.revision
    and incoming explicitly sets replace=True. Otherwise existing wins.
    """
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for row in existing:
        index[(row["id"], row["field"])] = row
    for row in incoming:
        key = (row["id"], row["field"])
        prev = index.get(key)
        if prev is None:
            index[key] = row
            continue
        incoming_rev = int(row.get("revision") or 0)
        prev_rev = int(prev.get("revision") or 0)
        if row.get("replace") and incoming_rev >= prev_rev:
            index[key] = row
        # else keep previous — re-run / auto import cannot clobber
    return [index[k] for k in sorted(index)]


def apply_overlays(items: list[dict[str, Any]], overlays: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {it["id"]: it for it in items}
    for row in overlays:
        item = by_id.get(row["id"])
        if item is None:
            continue
        field = row["field"]
        review = item.setdefault("review", {})
        if "value" in row:
            if field == "page":
                item.setdefault("source", {})["page"] = row["value"]
            else:
                item[field] = row["value"]
        if field == "primary_era":
            from common import period_block_for_era

            item["period_block"] = period_block_for_era(item.get("primary_era"))
            review["period_block"] = {
                "status": row.get("status") or "human",
                "by": row.get("by"),
                "at": row.get("at") or utc_now_iso(),
                "note": "derived_from_primary_era",
                "tool": row.get("tool"),
            }
        review[field] = {
            "status": row.get("status") or "human",
            "by": row.get("by"),
            "at": row.get("at") or utc_now_iso(),
            "note": row.get("note"),
            "tool": row.get("tool"),
        }
        statuses = item.setdefault("statuses", {})
        status = row.get("status")
        if status == "auto":
            statuses["auto_classified"] = True
        elif status == "ai_source_check":
            statuses["ai_source_checked"] = True
            statuses["auto_classified"] = True
        elif status == "human":
            statuses["human_reviewed"] = True
    return items
