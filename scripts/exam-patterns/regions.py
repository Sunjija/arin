"""Map question numbers to page/bbox and local-only stem windows.

Official stem text belongs under var/exam-patterns/extracts/ only.
Git-tracked items may store page/bbox metadata, never the stem.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

PAGE_RE = re.compile(r"<page\b([^>]*)>(.*?)</page>", re.S)
WORD_RE = re.compile(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"[^>]*>([^<]*)</word>'
)
NUM_DOT_RE = re.compile(r"^(\d{1,2})\.$")


def parse_bbox_pages(html: str) -> list[dict[str, Any]]:
    pages = []
    for i, match in enumerate(PAGE_RE.finditer(html), 1):
        attrs, body = match.group(1), match.group(2)
        width_m = re.search(r'width="([\d.]+)"', attrs)
        height_m = re.search(r'height="([\d.]+)"', attrs)
        width = float(width_m.group(1)) if width_m else 0.0
        height = float(height_m.group(1)) if height_m else 0.0
        words = []
        for x0, y0, x1, y1, text in WORD_RE.findall(body):
            words.append(
                {
                    "x0": float(x0),
                    "y0": float(y0),
                    "x1": float(x1),
                    "y1": float(y1),
                    "t": text,
                }
            )
        pages.append({"page": i, "w": width, "h": height, "mid": width / 2, "words": words})
    return pages


def _question_starts(pages: list[dict[str, Any]], *, min_height: float = 14.0) -> list[dict[str, Any]]:
    starts = []
    for page in pages:
        for word in page["words"]:
            match = NUM_DOT_RE.fullmatch(word["t"].strip())
            if not match:
                continue
            number = int(match.group(1))
            if not 1 <= number <= 50:
                continue
            height = word["y1"] - word["y0"]
            if height < min_height or word["y0"] < 40:
                continue
            col = 0 if word["x0"] < page["mid"] else 1
            starts.append({**word, "n": number, "page": page["page"], "col": col})
    return starts


def items_from_pages(pages: list[dict[str, Any]], *, min_height: float = 14.0) -> list[dict[str, Any]]:
    starts = _question_starts(pages, min_height=min_height)
    by_page = {page["page"]: page for page in pages}
    groups: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for start in starts:
        groups.setdefault((start["page"], start["col"]), []).append(start)
    items = []
    for start in starts:
        peers = sorted(groups[(start["page"], start["col"])], key=lambda row: row["y0"])
        nxt = next((row for row in peers if row["y0"] > start["y0"] + 1), None)
        page = by_page[start["page"]]
        x_min = 0.0 if start["col"] == 0 else page["mid"]
        x_max = page["mid"] if start["col"] == 0 else page["w"]
        y_max = nxt["y0"] - 2 if nxt else page["h"] - 20
        texts = [
            word["t"]
            for word in page["words"]
            if x_min <= word["x0"] < x_max and start["y0"] - 4 <= word["y0"] < y_max
        ]
        text = re.sub(r"\s+", " ", " ".join(texts)).strip()
        items.append(
            {
                "number": start["n"],
                "page": start["page"],
                "column": start["col"],
                "bbox": {
                    "left": round(start["x0"], 2),
                    "top": round(start["y0"], 2),
                    "width": round(start["x1"] - start["x0"], 2),
                    "height": round(start["y1"] - start["y0"], 2),
                },
                "char_count": len(text),
                "hangul_count": sum(1 for ch in text if "\uac00" <= ch <= "\ud7a3"),
                "text": text,
            }
        )
    items.sort(key=lambda row: row["number"])
    return items


def parse_tesseract_tsv(tsv_text: str, page: int, *, image_width: int | None = None) -> dict[str, Any]:
    words = []
    lines = tsv_text.splitlines()
    if not lines:
        return {"page": page, "w": image_width or 0, "h": 0, "mid": (image_width or 0) / 2, "words": []}
    header = lines[0].split("\t")
    idx = {name: i for i, name in enumerate(header)}
    max_x = 0.0
    max_y = 0.0
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) <= max(idx.get("text", 11), 11):
            continue
        text = parts[idx.get("text", 11)].strip()
        try:
            left = float(parts[idx.get("left", 6)])
            top = float(parts[idx.get("top", 7)])
            width = float(parts[idx.get("width", 8)])
            height = float(parts[idx.get("height", 9)])
        except ValueError:
            continue
        if not text:
            continue
        words.append({"x0": left, "y0": top, "x1": left + width, "y1": top + height, "t": text})
        max_x = max(max_x, left + width)
        max_y = max(max_y, top + height)
    width = float(image_width or max_x or 0)
    return {"page": page, "w": width, "h": max_y, "mid": width / 2 if width else 0, "words": words}


def summarize_regions(items: list[dict[str, Any]]) -> dict[str, Any]:
    by_number: dict[int, dict[str, Any]] = {}
    dups: list[int] = []
    for item in items:
        n = item["number"]
        if n in by_number:
            dups.append(n)
            continue
        by_number[n] = item
    ordered = [by_number[n] for n in sorted(by_number)]
    missing = [n for n in range(1, 51) if n not in by_number]
    return {
        "item_count": len(ordered),
        "missing_numbers": missing,
        "duplicate_numbers": dups,
        "items": ordered,
    }


def load_local_item_text(path: Path) -> dict[int, str]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {int(row["number"]): row.get("text") or "" for row in data.get("items") or []}
