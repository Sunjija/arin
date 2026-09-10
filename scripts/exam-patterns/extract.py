"""Extract answers, cover identity, and optional OCR without storing official stems in git."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

from common import (
    CIRCLED_DIGITS,
    DOWNLOAD_DIR,
    EXTRACT_DIR,
    OCR_DIR,
    PAGES_DIR,
    RESEARCH_DIR,
    TARGET_ROUNDS,
    WEB_DIR,
    blank_item,
    ensure_dirs,
    parse_round_from_title,
    read_json,
    sha256_file,
    utc_now_iso,
    write_json,
    write_jsonl,
)
from overlays import apply_overlays, load_overlays
from regions import items_from_pages, parse_bbox_pages, parse_tesseract_tsv, summarize_regions

ROUND_RE = re.compile(r"제\s*(\d+)\s*회")


def run_cmd(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=False)


def pdf_text(path: Path) -> str:
    result = run_cmd(["pdftotext", "-layout", str(path), "-"])
    if result.returncode != 0:
        return ""
    return result.stdout or ""


def pdf_info(path: Path) -> dict[str, Any]:
    result = run_cmd(["pdfinfo", str(path)])
    info: dict[str, Any] = {"ok": result.returncode == 0, "raw": result.stdout}
    pages = re.search(r"Pages:\s+(\d+)", result.stdout)
    if pages:
        info["pages"] = int(pages.group(1))
    return info


def parse_cover_text(text: str) -> dict[str, Any]:
    rounds = [int(x) for x in ROUND_RE.findall(text or "")]
    has_adv = "심화" in (text or "")
    has_basic = "기본" in (text or "") and not has_adv
    level = "advanced" if has_adv else ("basic" if has_basic else None)
    return {
        "rounds_mentioned": rounds,
        "round": rounds[0] if rounds else None,
        "level": level,
        "has_advanced_mark": has_adv,
        "has_basic_mark": "기본" in (text or ""),
        "text_excerpt": re.sub(r"\s+", " ", text or "")[:240],
    }


def parse_answer_key_text(text: str) -> dict[int, dict[str, Any]]:
    items: dict[int, dict[str, Any]] = {}
    circled_present = any(ch in text for ch in CIRCLED_DIGITS)
    if circled_present:
        normalized = text
        for glyph, value in CIRCLED_DIGITS.items():
            normalized = normalized.replace(glyph, f" A{value} ")
        tokens = re.findall(r"A[1-5]|\d+", normalized)
        i = 0
        while i < len(tokens) - 2:
            a, b, c = tokens[i], tokens[i + 1], tokens[i + 2]
            if a.isdigit() and 1 <= int(a) <= 50 and b.startswith("A") and c.isdigit() and c in {"1", "2", "3"}:
                n = int(a)
                if n not in items:
                    items[n] = {"number": n, "answer": int(b[1]), "points": int(c), "answer_glyph": "circled"}
                i += 3
                continue
            i += 1
    if len(items) < 50:
        nums = [int(x) for x in re.findall(r"\d+", text)]
        i = 0
        while i < len(nums) - 2:
            q, ans, pts = nums[i], nums[i + 1], nums[i + 2]
            if 1 <= q <= 50 and q not in items and 1 <= ans <= 5 and pts in {1, 2, 3}:
                items[q] = {"number": q, "answer": ans, "points": pts, "answer_glyph": "arabic"}
                i += 3
                continue
            i += 1
    return items


def render_pdf_pages(pdf_path: Path, dest_dir: Path, dpi: int = 150, first: int | None = None, last: int | None = None) -> list[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    prefix = dest_dir / "p"
    args = ["pdftoppm", "-png", "-r", str(dpi)]
    if first is not None:
        args += ["-f", str(first)]
    if last is not None:
        args += ["-l", str(last)]
    args += [str(pdf_path), str(prefix)]
    result = run_cmd(args)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or "pdftoppm failed")
    return sorted(dest_dir.glob("p*.png"))


def ocr_image(image_path: Path, out_txt: Path, lang: str = "kor+eng") -> dict[str, Any]:
    out_txt.parent.mkdir(parents=True, exist_ok=True)
    stem = out_txt.with_suffix("")
    result = run_cmd(["tesseract", str(image_path), str(stem), "-l", lang, "--psm", "3"])
    text = out_txt.read_text(encoding="utf-8") if out_txt.exists() else ""
    return {
        "path": str(out_txt),
        "ok": result.returncode == 0 and bool(text.strip()),
        "char_count": len(text),
        "hangul_count": sum(1 for ch in text if "\uac00" <= ch <= "\ud7a3"),
        "stderr": (result.stderr or "")[-300:],
    }


def ocr_question_starts(tsv_path: Path) -> list[dict[str, Any]]:
    """Parse tesseract TSV for tokens that look like item numbers."""
    if not tsv_path.exists():
        return []
    hits = []
    lines = tsv_path.read_text(encoding="utf-8", errors="replace").splitlines()
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) < 12:
            continue
        text = parts[11].strip()
        m = re.fullmatch(r"(\d{1,2})[.)]?", text)
        if not m:
            continue
        n = int(m.group(1))
        if 1 <= n <= 50:
            hits.append(
                {
                    "number": n,
                    "left": int(parts[6]),
                    "top": int(parts[7]),
                    "width": int(parts[8]),
                    "height": int(parts[9]),
                    "conf": float(parts[10]) if parts[10] not in {"", "-1"} else None,
                    "text": text,
                }
            )
    return hits


def extract_round(manifest_round: dict[str, Any], *, ocr_pages: bool = False, cover_ocr: bool = True) -> dict[str, Any]:
    ensure_dirs()
    rnd = manifest_round["round"]
    paper = manifest_round.get("paper") or {}
    key = manifest_round.get("answer_key") or {}
    out: dict[str, Any] = {
        "round": rnd,
        "extracted_at": utc_now_iso(),
        "paper": {},
        "answer_key": {},
        "web_answers": read_json(WEB_DIR / f"answers-{rnd}.json"),
        "cover": {"paper": None, "answer_key": None, "verified": False, "mismatch": False, "notes": []},
        "ocr": {"ran": False, "pages": []},
    }

    key_path = Path(key["local_path"]) if key.get("local_path") else None
    if key_path and key_path.exists():
        text = pdf_text(key_path)
        parsed = parse_answer_key_text(text)
        cover = parse_cover_text(text)
        (EXTRACT_DIR / f"{rnd:02d}-key.txt").write_text(text, encoding="utf-8")
        out["answer_key"] = {
            "path": str(key_path),
            "sha256": key.get("sha256") or sha256_file(key_path),
            "item_count": len(parsed),
            "points_sum": sum(v["points"] for v in parsed.values()),
            "items": [parsed[n] for n in sorted(parsed)],
            "cover": cover,
            "missing_numbers": [n for n in range(1, 51) if n not in parsed],
        }
        out["cover"]["answer_key"] = cover

    paper_path = Path(paper["local_path"]) if paper.get("local_path") else None
    if paper_path and paper_path.exists():
        info = pdf_info(paper_path)
        text = pdf_text(paper_path)
        hangul = sum(1 for ch in text if "\uac00" <= ch <= "\ud7a3")
        extract_method = "pdftotext" if hangul >= 80 else "ocr_needed"
        paper_cover = parse_cover_text(text)
        page_dir = PAGES_DIR / f"{rnd:02d}"
        ocr_dir = OCR_DIR / f"{rnd:02d}"
        if cover_ocr and extract_method == "ocr_needed":
            images = render_pdf_pages(paper_path, page_dir, dpi=150, first=1, last=1)
            if images:
                ocr_meta = ocr_image(images[0], ocr_dir / "p-01.txt")
                ocr_text = (ocr_dir / "p-01.txt").read_text(encoding="utf-8") if (ocr_dir / "p-01.txt").exists() else ""
                paper_cover = parse_cover_text(ocr_text)
                paper_cover["ocr"] = ocr_meta
                paper_cover["source"] = "page1_ocr"
        elif hangul >= 80:
            paper_cover["source"] = "pdftotext"
        out["paper"] = {
            "path": str(paper_path),
            "sha256": paper.get("sha256") or sha256_file(paper_path),
            "pages": info.get("pages"),
            "pdftotext_chars": len(text),
            "pdftotext_hangul": hangul,
            "extract_method": extract_method,
            "cover": paper_cover,
        }
        out["cover"]["paper"] = paper_cover
        out["ocr"] = {"ran": False, "pages": []}

    if paper_path and paper_path.exists():
        out["regions"] = extract_item_regions(
            rnd,
            paper_path,
            method=out.get("paper", {}).get("extract_method") or "ocr_needed",
            ocr_pages=ocr_pages,
        )

    paper_round = (out["cover"]["paper"] or {}).get("round")
    key_round = (out["cover"]["answer_key"] or {}).get("round")
    notes = out["cover"]["notes"]
    if paper_round and paper_round != rnd:
        out["cover"]["mismatch"] = True
        notes.append(f"문제지 표지 회차 {paper_round} ≠ 게시물 회차 {rnd}")
    if key_round and key_round != rnd:
        out["cover"]["mismatch"] = True
        notes.append(f"정답표 표지 회차 {key_round} ≠ 게시물 회차 {rnd}")
    if paper_round and key_round and paper_round != key_round:
        out["cover"]["mismatch"] = True
        notes.append(f"문제지 회차 {paper_round} ≠ 정답표 회차 {key_round}")
    paper_level = (out["cover"]["paper"] or {}).get("level")
    key_level = (out["cover"]["answer_key"] or {}).get("level")
    if key_level == "basic" or paper_level == "basic":
        out["cover"]["mismatch"] = True
        notes.append("기본 시험 표시가 감지됨")
    # Key PDFs reliably contain 제N회 심화. Paper image covers often omit 심화 in OCR.
    verified_round = key_round == rnd or paper_round == rnd
    verified_level = key_level == "advanced" or paper_level == "advanced"
    out["cover"]["verified"] = bool(verified_round and verified_level and not out["cover"]["mismatch"])
    if not (out["cover"]["paper"] or {}).get("has_advanced_mark"):
        notes.append("문제지 표지 OCR에서 심화 표기를 읽지 못함. 정답표 표지·게시물 제목과 교차 확인.")
    write_json(EXTRACT_DIR / f"{rnd:02d}.json", out)
    return out


def build_items(extracts: list[dict[str, Any]], manifest: dict[str, Any]) -> list[dict[str, Any]]:
    by_round_manifest = {r["round"]: r for r in manifest["rounds"]}
    items = [blank_item(rnd, n) for rnd in TARGET_ROUNDS for n in range(1, 51)]
    index = {(it["round"], it["number"]): it for it in items}
    now = utc_now_iso()
    for ext in extracts:
        rnd = ext["round"]
        man = by_round_manifest.get(rnd) or {}
        paper_sha = ((man.get("paper") or {}).get("sha256"))
        key_sha = ((man.get("answer_key") or {}).get("sha256"))
        web = ext.get("web_answers") or {}
        web_items = {i["number"]: i for i in web.get("items") or []}
        key_items = {i["number"]: i for i in (ext.get("answer_key") or {}).get("items") or []}
        web_sha = web.get("html_sha256")
        for n in range(1, 51):
            it = index[(rnd, n)]
            web_row = web_items.get(n)
            key_row = key_items.get(n)
            it["source"]["paper_sha256"] = paper_sha
            it["source"]["key_sha256"] = key_sha
            it["source"]["web_answer_sha256"] = web_sha
            it["statuses"]["acquired"] = bool(paper_sha and key_sha and web_row)
            if web_row:
                it["answer"] = web_row["answer"]
                it["points"] = web_row["points"]
                it["answer_labels"] = [web_row["answer"]]
                it["choice_count"] = 5
                it["review"]["answer"] = {
                    "status": "auto",
                    "by": "official-web-answer-table",
                    "at": now,
                    "note": "공식 정답 보기(심화=testlevel 1) + 정답표 PDF 교차검증",
                }
                it["review"]["points"] = {
                    "status": "auto",
                    "by": "official-web-answer-table",
                    "at": now,
                    "note": None,
                }
                it["source"]["extract_method"] = "official_web_answers"
                it["statuses"]["extracted"] = True
            if key_row and web_row and (key_row["answer"] != web_row["answer"] or key_row["points"] != web_row["points"]):
                it["review"]["answer"]["note"] = "정답표 PDF와 웹 정답표 불일치 — 웹 값을 유지하고 검증 오류로 표시"
                it["statuses"]["extracted"] = False
            elif key_row and not web_row:
                it["answer"] = key_row["answer"]
                it["points"] = key_row["points"]
                it["answer_labels"] = [key_row["answer"]]
                it["choice_count"] = 5
                it["statuses"]["extracted"] = True
                it["review"]["answer"]["status"] = "auto"
                it["review"]["points"]["status"] = "auto"
            obj = man.get("answer_correction") or {}
            if obj.get("corrected") is True:
                it["answer_corrections"].append(
                    {
                        "notice_url": obj.get("notice_url"),
                        "notice_title": obj.get("notice_title"),
                    }
                )
    # page mapping from column-aware regions (no stem text copied here)
    for ext in extracts:
        rnd = ext["round"]
        for row in ((ext.get("regions") or {}).get("items") or []):
            it = index.get((rnd, row["number"]))
            if not it:
                continue
            it["source"]["page"] = row.get("page")
            it["source"]["bbox"] = row.get("bbox")
            it["source"]["column"] = row.get("column")
            it["source"]["region_method"] = (ext.get("regions") or {}).get("method")
    return items


def _page_no_from_name(path: str) -> int | None:
    m = re.search(r"(\d+)\s*$", Path(path).stem)
    if not m:
        m = re.search(r"p-?(\d+)", Path(path).name)
    return int(m.group(1)) if m else None


def extract_item_regions(round_no: int, paper_path: Path, *, method: str, ocr_pages: bool) -> dict[str, Any]:
    """Write stem windows to var/ only. Return metadata plus local item list."""
    pages: list[dict[str, Any]] = []
    min_height = 14.0
    used = None
    if method == "pdftotext":
        html_path = EXTRACT_DIR / f"{round_no:02d}-bbox.html"
        result = run_cmd(["pdftotext", "-bbox-layout", str(paper_path), str(html_path)])
        html = html_path.read_text(encoding="utf-8", errors="replace") if result.returncode == 0 and html_path.exists() else ""
        pages = parse_bbox_pages(html)
        (EXTRACT_DIR / f"{round_no:02d}-paper.txt").write_text(pdf_text(paper_path), encoding="utf-8")
        used = "pdftotext-bbox"
    elif ocr_pages:
        page_dir = PAGES_DIR / f"{round_no:02d}"
        ocr_dir = OCR_DIR / f"{round_no:02d}"
        images = render_pdf_pages(paper_path, page_dir, dpi=150)
        for img in images:
            txt_path = ocr_dir / f"{img.stem}.txt"
            ocr_image(img, txt_path)
            stem = ocr_dir / img.stem
            run_cmd(["tesseract", str(img), str(stem), "-l", "kor+eng", "--psm", "3", "tsv"])
            tsv_path = ocr_dir / f"{img.stem}.tsv"
            tsv_text = tsv_path.read_text(encoding="utf-8", errors="replace") if tsv_path.exists() else ""
            page_no = _page_no_from_name(str(img)) or 0
            pages.append(parse_tesseract_tsv(tsv_text, page_no))
        min_height = 8.0
        used = "tesseract-tsv"
    summary = summarize_regions(items_from_pages(pages, min_height=min_height) if pages else [])
    payload = {
        "round": round_no,
        "method": used,
        "git_excluded": True,
        **summary,
    }
    write_json(EXTRACT_DIR / f"{round_no:02d}-item-regions.json", payload)
    public_items = [
        {
            "number": row["number"],
            "page": row["page"],
            "column": row["column"],
            "bbox": row["bbox"],
            "char_count": row["char_count"],
            "hangul_count": row["hangul_count"],
        }
        for row in summary["items"]
    ]
    return {
        "round": round_no,
        "method": used,
        "item_count": summary["item_count"],
        "missing_numbers": summary["missing_numbers"],
        "duplicate_numbers": summary["duplicate_numbers"],
        "items": public_items,
    }


def public_cover(cover: dict[str, Any]) -> dict[str, Any]:
    """Drop OCR/PDF excerpts so git-tracked manifests never store official stems."""

    def slim(block: dict[str, Any] | None) -> dict[str, Any] | None:
        if not block:
            return None
        return {
            "round": block.get("round"),
            "level": block.get("level"),
            "has_advanced_mark": block.get("has_advanced_mark"),
            "has_basic_mark": block.get("has_basic_mark"),
            "source": block.get("source"),
            "ocr_ok": (block.get("ocr") or {}).get("ok"),
        }

    return {
        "paper": slim(cover.get("paper")),
        "answer_key": slim(cover.get("answer_key")),
        "verified": cover.get("verified"),
        "mismatch": cover.get("mismatch"),
        "notes": cover.get("notes"),
    }


def extract_all(manifest: dict[str, Any] | None = None, *, ocr_pages: bool = False) -> dict[str, Any]:
    ensure_dirs()
    manifest = manifest or read_json(RESEARCH_DIR / "manifest.json")
    extracts = []
    for rnd in manifest["rounds"]:
        extracts.append(extract_round(rnd, ocr_pages=ocr_pages, cover_ocr=True))
        # persist cover back into manifest
        rnd["cover"] = public_cover(extracts[-1]["cover"])
        rnd["statuses"]["cover_verified"] = extracts[-1]["cover"]["verified"]
        rnd["statuses"]["extracted"] = bool((extracts[-1].get("web_answers") or {}).get("item_count") == 50)
    items = build_items(extracts, manifest)
    from classify import classify_from_local_regions

    items = classify_from_local_regions(items)
    items = apply_overlays(items, load_overlays())
    write_jsonl(RESEARCH_DIR / "items.jsonl", items)
    write_json(RESEARCH_DIR / "manifest.json", manifest)
    write_json(
        EXTRACT_DIR / "summary.json",
        {
            "generated_at": utc_now_iso(),
            "rounds": [
                {
                    "round": e["round"],
                    "cover": e["cover"],
                    "key_items": (e.get("answer_key") or {}).get("item_count"),
                    "web_items": (e.get("web_answers") or {}).get("item_count"),
                    "paper_method": (e.get("paper") or {}).get("extract_method"),
                }
                for e in extracts
            ],
        },
    )
    return {"extracts": extracts, "items": items, "manifest": manifest}


if __name__ == "__main__":
    result = extract_all()
    print("extracted", len(result["items"]), "item rows")
