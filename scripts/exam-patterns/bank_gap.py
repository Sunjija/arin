"""Read-only gap report against src/data/questions.ts. Does not modify the bank."""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from common import REPO_ROOT, utc_now_iso

QUESTIONS_PATH = REPO_ROOT / "src" / "data" / "questions.ts"

COMPARE_IDS = ["q-57", "q-99", "q-27", "q-55", "q-86", "q-70", "q-01", "q-52", "q-24", "q-96"]


def parse_questions_ts(path: Path | None = None) -> list[dict[str, Any]]:
    text = (path or QUESTIONS_PATH).read_text(encoding="utf-8")
    chunks = re.split(r"\n\s*\{\s*\n", text)
    items = []
    for chunk in chunks:
        mid = re.search(r"id:\s*'([^']+)'", chunk)
        if not mid:
            continue
        era = re.search(r"era:\s*'([^']+)'", chunk)
        diff = re.search(r"difficulty:\s*([123])", chunk)
        fmt = re.search(r"formatId:\s*'([^']+)'", chunk)
        tags = re.findall(r"tags:\s*\[([^\]]+)\]", chunk)
        tag_vals = []
        if tags:
            tag_vals = re.findall(r"'([^']+)'", tags[0])
        passage = bool(re.search(r"passage:", chunk))
        items.append(
            {
                "id": mid.group(1),
                "era": era.group(1) if era else None,
                "difficulty": int(diff.group(1)) if diff else None,
                "formatId": fmt.group(1) if fmt else None,
                "tags": tag_vals,
                "has_passage": passage,
            }
        )
    # drop non q- ids
    return [it for it in items if it["id"].startswith("q-")]


def gap_report(bank: list[dict[str, Any]], official_items: list[dict[str, Any]]) -> dict[str, Any]:
    era_bank = Counter(it["era"] for it in bank if it.get("era"))
    pts_bank = Counter(it["difficulty"] for it in bank if it.get("difficulty"))
    fmt_bank = Counter(it["formatId"] for it in bank if it.get("formatId"))
    official_era = Counter(it["primary_era"] for it in official_items if it.get("primary_era"))
    combos_official = Counter(
        (it.get("primary_era"), it.get("internal_format_id"), it.get("points"))
        for it in official_items
        if it.get("primary_era") and it.get("internal_format_id") and it.get("points")
    )
    combos_bank = Counter((it.get("era"), it.get("formatId"), it.get("difficulty")) for it in bank)
    missing_combos = []
    for combo, n in combos_official.most_common():
        if combos_bank.get(combo, 0) == 0:
            missing_combos.append({"era": combo[0], "format": combo[1], "points": combo[2], "official_n": n})
    return {
        "generated_at": utc_now_iso(),
        "bank_size": len(bank),
        "bank_with_passage": sum(1 for it in bank if it.get("has_passage")),
        "bank_without_passage": sum(1 for it in bank if not it.get("has_passage")),
        "bank_eras": dict(era_bank),
        "bank_points": {str(k): v for k, v in pts_bank.items()},
        "bank_formats": dict(fmt_bank),
        "official_classified_eras": dict(official_era),
        "missing_era_format_points_combos": missing_combos[:40],
        "note": "문항 은행은 읽기 전용으로 집계했다. 문항 생성·조립 코드는 변경하지 않았다.",
    }


def comparison_candidates(bank: list[dict[str, Any]], official_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {it["id"]: it for it in bank}
    out = []
    classified = [it for it in official_items if it.get("primary_era") and it.get("internal_format_id")]
    for qid in COMPARE_IDS:
        q = by_id.get(qid)
        if not q:
            out.append({"bank_id": qid, "error": "not_found_in_bank"})
            continue
        scored = []
        for off in classified:
            score = 0
            reasons = []
            if off.get("primary_era") == q.get("era"):
                score += 3
                reasons.append("같은 시대")
            if off.get("internal_format_id") == q.get("formatId"):
                score += 3
                reasons.append("같은 내부 형식")
            if off.get("points") == q.get("difficulty"):
                score += 2
                reasons.append("같은 배점")
            if off.get("official_skill_type_estimate") and q.get("formatId"):
                score += 0
            if score >= 6:
                scored.append(
                    {
                        "official_id": off["id"],
                        "round": off["round"],
                        "number": off["number"],
                        "score": score,
                        "reasons": reasons,
                        "official_era": off.get("primary_era"),
                        "official_format": off.get("internal_format_id"),
                        "official_points": off.get("points"),
                        "official_skill_estimate": off.get("official_skill_type_estimate"),
                    }
                )
        scored.sort(key=lambda x: (-x["score"], x["round"], x["number"]))
        out.append(
            {
                "bank_id": qid,
                "bank_era": q.get("era"),
                "bank_format": q.get("formatId"),
                "bank_points": q.get("difficulty"),
                "candidates": scored[:5],
                "forced": False,
                "note": None if scored else "적합한 공식 기출 비교 후보를 억지로 연결하지 않음.",
            }
        )
    return out
