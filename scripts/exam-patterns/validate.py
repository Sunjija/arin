"""Deterministic validation of manifests, answers, covers, and items."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any
import json

from common import ITEMS_PER_ROUND, TARGET_ROUNDS, utc_now_iso


def validate_cover_link(expected_round: int, expected_level: str, observed: dict[str, Any]) -> list[dict[str, Any]]:
    issues = []
    obs_round = observed.get("round")
    obs_level = observed.get("level")
    if obs_round is None:
        issues.append({"code": "cover_round_unconfirmed", "severity": "warning", "detail": "표지에서 회차를 읽지 못함"})
    elif obs_round != expected_round:
        issues.append(
            {
                "code": "cover_round_mismatch",
                "severity": "error",
                "detail": f"expected {expected_round}, cover {obs_round}",
            }
        )
    if obs_level is None:
        issues.append({"code": "cover_level_unconfirmed", "severity": "warning", "detail": "표지에서 심화/기본을 읽지 못함"})
    elif obs_level != expected_level:
        issues.append(
            {
                "code": "cover_level_mismatch",
                "severity": "error",
                "detail": f"expected {expected_level}, cover {obs_level}",
            }
        )
    return issues


def validate_items_for_round(items: list[dict[str, Any]], round_no: int) -> list[dict[str, Any]]:
    issues = []
    subset = [it for it in items if it["round"] == round_no]
    numbers = [it["number"] for it in subset]
    counts = Counter(numbers)
    missing = [n for n in range(1, ITEMS_PER_ROUND + 1) if counts.get(n, 0) == 0]
    dupes = [n for n, c in counts.items() if c > 1]
    if missing:
        issues.append({"code": "missing_numbers", "severity": "error", "detail": missing, "round": round_no})
    if dupes:
        issues.append({"code": "duplicate_numbers", "severity": "error", "detail": dupes, "round": round_no})

    extracted = [it for it in subset if it.get("points") is not None]
    if extracted and len(extracted) != ITEMS_PER_ROUND:
        issues.append(
            {
                "code": "incomplete_extraction",
                "severity": "warning",
                "detail": {"extracted": len(extracted), "expected": ITEMS_PER_ROUND},
                "round": round_no,
            }
        )
    if len(extracted) == ITEMS_PER_ROUND:
        total = sum(it["points"] for it in extracted)
        if total != 100:
            issues.append({"code": "points_sum", "severity": "error", "detail": total, "round": round_no})
        band = Counter(it["points"] for it in extracted)
        if band.get(1) != 10 or band.get(2) != 30 or band.get(3) != 10:
            issues.append({"code": "points_quota", "severity": "warning", "detail": dict(band), "round": round_no})
    for it in extracted:
        if it.get("choice_count") not in {None, 5}:
            issues.append({"code": "choice_count", "severity": "error", "id": it["id"], "detail": it.get("choice_count")})
        if it.get("answer") is not None and it["answer"] not in {1, 2, 3, 4, 5}:
            issues.append({"code": "answer_range", "severity": "error", "id": it["id"], "detail": it.get("answer")})
        if it.get("exam_level") != "advanced":
            issues.append({"code": "level_mix", "severity": "error", "id": it["id"], "detail": it.get("exam_level")})
    return issues


def validate_answer_sources(web_items: list[dict[str, Any]], key_items: list[dict[str, Any]], round_no: int) -> list[dict[str, Any]]:
    issues = []
    web = {i["number"]: i for i in web_items}
    key = {i["number"]: i for i in key_items}
    for n in range(1, 51):
        if n not in web:
            issues.append({"code": "web_answer_missing", "severity": "error", "round": round_no, "number": n})
        if n not in key:
            issues.append({"code": "key_answer_missing", "severity": "warning", "round": round_no, "number": n})
        if n in web and n in key:
            if web[n]["answer"] != key[n]["answer"] or web[n]["points"] != key[n]["points"]:
                issues.append(
                    {
                        "code": "answer_source_mismatch",
                        "severity": "error",
                        "round": round_no,
                        "number": n,
                        "web": web[n],
                        "key": key[n],
                    }
                )
    return issues


def validate_duplicate_files(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    issues = []
    by_sha: dict[str, list[str]] = defaultdict(list)
    for rnd in manifest.get("rounds") or []:
        for kind in ("paper", "answer_key"):
            rec = rnd.get(kind) or {}
            digest = rec.get("sha256")
            if digest:
                by_sha[digest].append(f"{rnd['round']}:{kind}")
    for digest, owners in by_sha.items():
        if len(owners) > 1:
            issues.append({"code": "duplicate_file_sha256", "severity": "error", "sha256": digest, "owners": owners})
    return issues


def validate_correction_application(items: list[dict[str, Any]], corrections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """corrections: {round, number, answer, points, applied}"""
    issues = []
    index = {(it["round"], it["number"]): it for it in items}
    for corr in corrections:
        it = index.get((corr["round"], corr["number"]))
        if it is None:
            issues.append({"code": "correction_target_missing", "severity": "error", "detail": corr})
            continue
        if corr.get("applied"):
            if it.get("answer") != corr.get("answer") or it.get("points") != corr.get("points"):
                issues.append({"code": "correction_not_applied", "severity": "error", "id": it["id"], "detail": corr})
            if not it.get("answer_corrections"):
                issues.append({"code": "correction_unrecorded", "severity": "error", "id": it["id"]})
    return issues


def validate_all(
    items: list[dict[str, Any]],
    manifest: dict[str, Any],
    extracts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    issues.extend(validate_duplicate_files(manifest))
    for rnd in TARGET_ROUNDS:
        issues.extend(validate_items_for_round(items, rnd))
    extract_by_round = {e["round"]: e for e in (extracts or [])}
    for rnd in manifest.get("rounds") or []:
        n = rnd["round"]
        cover = rnd.get("cover") or {}
        key_cover = cover.get("answer_key") or {}
        if key_cover:
            issues.extend(validate_cover_link(n, "advanced", key_cover))
        paper_cover = cover.get("paper") or {}
        if paper_cover and paper_cover.get("round"):
            issues.extend(validate_cover_link(n, paper_cover.get("level") or "advanced", paper_cover))
        ext = extract_by_round.get(n)
        if ext:
            web = (ext.get("web_answers") or {}).get("items") or []
            key = (ext.get("answer_key") or {}).get("items") or []
            if web:
                issues.extend(validate_answer_sources(web, key, n))
        if cover.get("mismatch"):
            issues.append({"code": "manifest_cover_mismatch", "severity": "error", "round": n, "detail": cover.get("notes")})
        blob = json.dumps(rnd, ensure_ascii=False)
        if "text_excerpt" in blob:
            issues.append({"code": "official_excerpt_in_manifest", "severity": "error", "round": n})
    errors = [i for i in issues if i.get("severity") == "error"]
    return {
        "generated_at": utc_now_iso(),
        "ok": not errors,
        "error_count": len(errors),
        "warning_count": len(issues) - len(errors),
        "issues": issues,
    }
