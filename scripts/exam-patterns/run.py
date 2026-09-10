#!/usr/bin/env python3
"""Exam-pattern research CLI. Does not modify the learning app."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from aggregate import DEFAULT_WEIGHTS, aggregate, blueprint_candidates  # noqa: E402
from bank_gap import comparison_candidates, gap_report, parse_questions_ts  # noqa: E402
from collect import build_manifest, collect_target_rounds  # noqa: E402
from common import (  # noqa: E402
    ANALYSIS_VERSION,
    RESEARCH_DIR,
    TARGET_ITEM_COUNT,
    TARGET_ROUNDS,
    ensure_dirs,
    read_json,
    read_jsonl,
    utc_now_iso,
    write_json,
    write_jsonl,
)
from extract import extract_all  # noqa: E402
from classify import classify  # noqa: E402
from report import write_reports  # noqa: E402
from validate import validate_all  # noqa: E402


def fingerprint(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for path in paths:
        h.update(path.name.encode())
        if path.exists():
            h.update(path.read_bytes())
        h.update(b"\n")
    return h.hexdigest()


def cmd_collect(args: argparse.Namespace) -> None:
    rounds = args.rounds or TARGET_ROUNDS
    result = collect_target_rounds(rounds)
    build_manifest(result)
    print(f"collect: {len(result['rounds'])} rounds, errors={len(result['errors'])}")


def cmd_extract(args: argparse.Namespace) -> None:
    extract_all(ocr_pages=args.ocr_pages)
    print("extract: wrote items.jsonl and extract summary")


def cmd_classify(_args: argparse.Namespace) -> None:
    items = classify()
    auto = sum(1 for it in items if it["statuses"].get("auto_classified"))
    print(f"classify: auto_classified={auto}")


def cmd_validate(_args: argparse.Namespace) -> None:
    items = read_jsonl(RESEARCH_DIR / "items.jsonl")
    manifest = read_json(RESEARCH_DIR / "manifest.json") or {"rounds": []}
    extracts = []
    extract_dir = Path(__file__).resolve().parents[2] / "var" / "exam-patterns" / "extracts"
    for rnd in TARGET_ROUNDS:
        row = read_json(extract_dir / f"{rnd:02d}.json")
        if row:
            extracts.append(row)
    report = validate_all(items, manifest, extracts)
    write_json(RESEARCH_DIR / "validation.json", report)
    print(f"validate: ok={report['ok']} errors={report['error_count']} warnings={report['warning_count']}")
    if not report["ok"] and not getattr(_args, "allow_fail", False):
        sys.exit(1)


def _coverage(items, manifest, validation) -> dict:
    return {
        "generated_at": utc_now_iso(),
        "data_version": ANALYSIS_VERSION,
        "target_rounds": TARGET_ROUNDS,
        "target_items": TARGET_ITEM_COUNT,
        "acquired_rounds": sum(1 for r in manifest.get("rounds") or [] if (r.get("statuses") or {}).get("paper_downloaded")),
        "extracted_items": sum(1 for it in items if it["statuses"].get("extracted")),
        "auto_classified_items": sum(1 for it in items if it["statuses"].get("auto_classified")),
        "ai_source_checked_items": sum(1 for it in items if it["statuses"].get("ai_source_checked")),
        "human_reviewed_items": sum(1 for it in items if it["statuses"].get("human_reviewed")),
        "classified_rounds": sorted({it["round"] for it in items if it.get("primary_era")}),
        "ai_checked_rounds": sorted({it["round"] for it in items if it["statuses"].get("ai_source_checked")}),
        "do_not_treat_placeholder_rows_as_complete": True,
        "validation_ok": validation.get("ok"),
        "input_fingerprint": fingerprint(
            [
                RESEARCH_DIR / "items.jsonl",
                RESEARCH_DIR / "overlays" / "reviews.jsonl",
                RESEARCH_DIR / "codebook.md",
                RESEARCH_DIR / "config" / "weights.json",
            ]
        ),
    }


def cmd_aggregate(_args: argparse.Namespace) -> None:
    items = read_jsonl(RESEARCH_DIR / "items.jsonl")
    manifest = read_json(RESEARCH_DIR / "manifest.json") or {"rounds": []}
    weights = read_json(RESEARCH_DIR / "config" / "weights.json") or DEFAULT_WEIGHTS
    dist = aggregate(items, weights)
    blueprint = blueprint_candidates(dist, items)
    validation = read_json(RESEARCH_DIR / "validation.json") or validate_all(items, manifest)
    coverage = _coverage(items, manifest, validation)
    write_json(RESEARCH_DIR / "distributions.json", dist)
    write_json(RESEARCH_DIR / "blueprint-candidates.json", blueprint)
    write_json(RESEARCH_DIR / "coverage.json", coverage)
    write_json(RESEARCH_DIR / "handoff" / "bank-gap.json", gap_report(parse_questions_ts(), items))
    write_json(RESEARCH_DIR / "handoff" / "comparison-candidates.json", {"items": comparison_candidates(parse_questions_ts(), items)})
    _write_review_queue(items)
    print("aggregate: distributions and blueprints written")


def _write_review_queue(items) -> None:
    import csv

    path = RESEARCH_DIR / "review-queue.csv"
    fields = ["id", "round", "number", "points", "primary_era", "visual_required", "uncertainty", "priority", "reason"]
    rows = []
    for it in items:
        reasons = []
        if not it["statuses"].get("extracted"):
            reasons.append("미추출")
        if it.get("visual_required") is None and it["statuses"].get("extracted"):
            reasons.append("시각자료 미확인")
        if not it["statuses"].get("ai_source_checked") and not it["statuses"].get("human_reviewed"):
            reasons.append("원본 미대조")
        if it.get("uncertainty") in {"high", "medium"}:
            reasons.append(f"불확실성={it.get('uncertainty')}")
        if not reasons:
            continue
        pri = 1 if it["round"] >= 75 else 2
        if "미추출" in reasons:
            pri = 0
        rows.append(
            {
                "id": it["id"],
                "round": it["round"],
                "number": it["number"],
                "points": it.get("points"),
                "primary_era": it.get("primary_era"),
                "visual_required": it.get("visual_required"),
                "uncertainty": it.get("uncertainty"),
                "priority": pri,
                "reason": ";".join(reasons),
            }
        )
    rows.sort(key=lambda r: (r["priority"], -r["round"], r["number"]))
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def cmd_report(_args: argparse.Namespace) -> None:
    items = read_jsonl(RESEARCH_DIR / "items.jsonl")
    manifest = read_json(RESEARCH_DIR / "manifest.json") or {"rounds": []}
    dist = read_json(RESEARCH_DIR / "distributions.json") or {}
    validation = read_json(RESEARCH_DIR / "validation.json") or {}
    blueprint = read_json(RESEARCH_DIR / "blueprint-candidates.json") or {}
    coverage = read_json(RESEARCH_DIR / "coverage.json") or _coverage(items, manifest, validation)
    write_reports(manifest, coverage, dist, validation, blueprint)
    print("report: wrote report.md and report.html")


def cmd_all(args: argparse.Namespace) -> None:
    if not args.skip_collect:
        cmd_collect(args)
    cmd_extract(args)
    args.allow_fail = True
    try:
        cmd_validate(args)
    except SystemExit:
        pass
    cmd_aggregate(args)
    cmd_report(args)


def cmd_test(_args: argparse.Namespace) -> None:
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)


def main() -> None:
    ensure_dirs()
    parser = argparse.ArgumentParser(description="Official advanced exam pattern research")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_collect = sub.add_parser("collect")
    p_collect.add_argument("--rounds", nargs="*", type=int)
    p_collect.set_defaults(func=cmd_collect)
    p_ex = sub.add_parser("extract")
    p_ex.add_argument("--ocr-pages", action="store_true")
    p_ex.set_defaults(func=cmd_extract)
    p_cl = sub.add_parser("classify")
    p_cl.set_defaults(func=cmd_classify)
    p_val = sub.add_parser("validate")
    p_val.add_argument("--allow-fail", action="store_true")
    p_val.set_defaults(func=cmd_validate)
    p_agg = sub.add_parser("aggregate")
    p_agg.set_defaults(func=cmd_aggregate)
    p_rep = sub.add_parser("report")
    p_rep.set_defaults(func=cmd_report)
    p_all = sub.add_parser("all")
    p_all.add_argument("--skip-collect", action="store_true")
    p_all.add_argument("--ocr-pages", action="store_true")
    p_all.add_argument("--rounds", nargs="*", type=int)
    p_all.set_defaults(func=cmd_all)
    p_test = sub.add_parser("test")
    p_test.set_defaults(func=cmd_test)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
