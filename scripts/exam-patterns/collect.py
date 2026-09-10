"""Collect official advanced exam papers, keys, web answers, and objection notices."""

from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

from common import (
    ANSWER_URL,
    DATAROOM_URL,
    DOWNLOAD_DIR,
    FILE_URL,
    LIST_URL,
    NOTICE_LIST_URL,
    NOTICE_VIEW_URL,
    OFFICIAL_ORIGIN,
    PAST_LIST_URL,
    SCHEDULE_URL,
    TARGET_ROUNDS,
    VIEW_URL,
    WEB_DIR,
    WEB_LEVEL_ADVANCED,
    ensure_dirs,
    parse_round_from_title,
    read_json,
    sha256_file,
    title_looks_advanced,
    title_looks_basic,
    utc_now_iso,
    write_json,
)
from http_util import FetchError, cache_text, fetch

POST_ID_RE = re.compile(r"fn_goDetail\('(\d+)','([^']+)'\);\s*\"\s*>([^<]+)</a>", re.I)
FILE_RE = re.compile(
    r"fnFileDownload\('([^']+)'\)[^>]*>\s*([^<]+)",
    re.I | re.S,
)
DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def _strip_tags(raw: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", raw, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def list_dataroom_advanced(page_unit: int = 20) -> list[dict[str, Any]]:
    ensure_dirs()
    meta = fetch(
        LIST_URL,
        method="POST",
        data={
            "pst_sno": "0",
            "pageIndex": "1",
            "searchCondition": "pstTitle",
            "searchKeyword": "심화",
            "pageUnit": str(page_unit),
        },
        referer=DATAROOM_URL,
    )
    html_text = cache_text(meta)
    (WEB_DIR / "dataroom-advanced.html").write_text(html_text, encoding="utf-8")
    posts: list[dict[str, Any]] = []
    for match in POST_ID_RE.finditer(html_text):
        post_id, bbs_id, title = match.group(1), match.group(2), match.group(3).strip()
        window = html_text[match.start() : match.start() + 900]
        dates = DATE_RE.findall(window)
        posted_at = dates[0] if dates else None
        posts.append(
            {
                "post_id": post_id,
                "bbs_id": bbs_id,
                "title": title,
                "posted_at": posted_at,
                "list_url": DATAROOM_URL,
                "view_url": f"{VIEW_URL}&pst_sno={post_id}",
                "advanced": title_looks_advanced(title),
                "basic": title_looks_basic(title),
                "round": parse_round_from_title(title),
                "has_correction_in_title": "정정" in title,
            }
        )
    return posts


def fetch_post_view(post_id: str) -> dict[str, Any]:
    meta = fetch(
        VIEW_URL,
        method="POST",
        data={"pst_sno": post_id, "pageIndex": "1"},
        referer=DATAROOM_URL,
    )
    html_text = cache_text(meta)
    (WEB_DIR / f"view-{post_id}.html").write_text(html_text, encoding="utf-8")
    files = []
    for file_id, name in FILE_RE.findall(html_text):
        name = html.unescape(name).replace("\xa0", " ").replace("&nbsp;", " ").strip()
        kind = classify_file_kind(name)
        files.append(
            {
                "atch_file_id": file_id,
                "filename": name,
                "kind": kind,
                "file_url": f"{FILE_URL}?atch_file_id={quote(file_id)}",
            }
        )
    # Prefer table-section labels when the filename is ambiguous.
    if len(files) >= 1 and "시험지파일" in html_text:
        paper_section = html_text.split("시험지파일", 1)[-1].split("답안지파일", 1)[0]
        for rec in files:
            if rec["atch_file_id"] in paper_section and rec["kind"] == "unknown":
                rec["kind"] = "question_paper"
    if len(files) >= 1 and "답안지파일" in html_text:
        key_section = html_text.split("답안지파일", 1)[-1]
        for rec in files:
            if rec["atch_file_id"] in key_section and rec["kind"] == "unknown":
                rec["kind"] = "answer_key"
    body = _strip_tags(html_text)
    return {
        "post_id": post_id,
        "html_sha256": meta["sha256"],
        "fetched_at": meta["fetched_at"],
        "files": files,
        "body_excerpt": body[:500],
        "has_correction_language": any(k in body for k in ("정정", "복수 정답", "복수정답")),
    }


def classify_file_kind(filename: str) -> str:
    lower = filename.lower()
    if "답" in filename or "정답" in filename or "key" in lower:
        return "answer_key"
    if "문제" in filename or "시험지" in filename or "paper" in lower:
        return "question_paper"
    return "unknown"


def download_file(file_url: str, dest: Path, referer: str) -> dict[str, Any]:
    ensure_dirs()
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return {
            "path": str(dest),
            "bytes": dest.stat().st_size,
            "sha256": sha256_file(dest),
            "downloaded_at": utc_now_iso(),
            "cache_hit": True,
            "url": file_url,
        }
    meta = fetch(file_url, referer=referer, timeout=120, min_interval_s=1.5)
    src = Path(meta["path"])
    dest.write_bytes(src.read_bytes())
    disp = meta.get("content_disposition") or ""
    filename = dest.name
    m = re.search(r"filename\*=UTF-8''([^;]+)|filename=([^;]+)", disp, re.I)
    if m:
        filename = unquote((m.group(1) or m.group(2) or filename).strip().strip('"'))
    return {
        "path": str(dest),
        "bytes": dest.stat().st_size,
        "sha256": sha256_file(dest),
        "downloaded_at": meta["fetched_at"],
        "cache_hit": meta.get("cache_hit", False),
        "url": file_url,
        "content_type": meta.get("content_type"),
        "declared_filename": filename,
        "http_status": meta.get("status"),
    }


def fetch_web_answers(round_no: int) -> dict[str, Any]:
    meta = fetch(
        ANSWER_URL,
        method="POST",
        data={"times": str(round_no), "testlevel": WEB_LEVEL_ADVANCED},
        referer=ANSWER_URL,
    )
    html_text = cache_text(meta)
    (WEB_DIR / f"answers-{round_no}-advanced.html").write_text(html_text, encoding="utf-8")
    items = parse_web_answer_table(html_text)
    return {
        "round": round_no,
        "exam_level": "advanced",
        "source_url": ANSWER_URL,
        "fetched_at": meta["fetched_at"],
        "html_sha256": meta["sha256"],
        "items": items,
        "item_count": len(items),
        "points_sum": sum(i["points"] for i in items if i.get("points") is not None),
        "parse_errors": [i for i in items if i.get("answer") is None or i.get("points") is None],
    }


def parse_web_answer_table(html_text: str) -> list[dict[str, Any]]:
    """Parse the two-column official answer table (문항/정답/배점 × 2)."""
    tbody = re.search(r"<tbody>([\s\S]*?)</tbody>", html_text, re.I)
    if not tbody:
        return []
    rows: dict[int, dict[str, Any]] = {}
    for tr in re.finditer(r"<tr>([\s\S]*?)</tr>", tbody.group(1), re.I):
        ths = re.findall(r"<th[^>]*>(.*?)</th>", tr.group(1), re.I | re.S)
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr.group(1), re.I | re.S)
        numbers = [int(re.sub(r"\D", "", _strip_tags(th))) for th in ths if re.search(r"\d", th)]
        values = []
        for td in tds:
            text = _strip_tags(td)
            if not text:
                continue
            if re.fullmatch(r"\d+", text):
                values.append(int(text))
        # Expected: n1, n2 and values [ans1, pts1, ans2, pts2]
        if len(numbers) == 2 and len(values) >= 4:
            rows[numbers[0]] = {"number": numbers[0], "answer": values[0], "points": values[1]}
            rows[numbers[1]] = {"number": numbers[1], "answer": values[2], "points": values[3]}
        elif len(numbers) == 1 and len(values) >= 2:
            rows[numbers[0]] = {"number": numbers[0], "answer": values[0], "points": values[1]}
    return [rows[n] for n in sorted(rows)]


def list_objection_notices() -> list[dict[str, Any]]:
    meta = fetch(
        NOTICE_LIST_URL,
        method="POST",
        data={
            "pst_sno": "0",
            "pageIndex": "1",
            "searchCondition": "pstTitle",
            "searchKeyword": "이의",
            "pageUnit": "20",
        },
        referer=NOTICE_LIST_URL,
    )
    html_text = cache_text(meta)
    (WEB_DIR / "notices-objection.html").write_text(html_text, encoding="utf-8")
    notices = []
    for match in POST_ID_RE.finditer(html_text):
        post_id, bbs_id, title = match.group(1), match.group(2), match.group(3).strip()
        notices.append(
            {
                "post_id": post_id,
                "bbs_id": bbs_id,
                "title": title,
                "round": parse_round_from_title(title),
                "view_url": f"{NOTICE_VIEW_URL}&pst_sno={post_id}",
            }
        )
    return notices


def fetch_notice_view(post_id: str) -> dict[str, Any]:
    meta = fetch(
        NOTICE_VIEW_URL,
        method="POST",
        data={"pst_sno": post_id, "pageIndex": "1"},
        referer=NOTICE_LIST_URL,
    )
    html_text = cache_text(meta)
    (WEB_DIR / f"notice-{post_id}.html").write_text(html_text, encoding="utf-8")
    body = _strip_tags(html_text)
    correction = None
    if any(k in body for k in ("정정", "복수 정답", "복수정답", "정답을 변경", "정답 변경")):
        correction = True
    if any(
        k in body
        for k in (
            "최초 공개했던 정답에는 문제가 없었습니다",
            "최초 공개 정답을 최종 정답으로 확정",
            "정답에는 문제가 없었습니다",
        )
    ):
        correction = False
    return {
        "post_id": post_id,
        "fetched_at": meta["fetched_at"],
        "html_sha256": meta["sha256"],
        "body_excerpt": body[:800],
        "answer_corrected": correction,
    }


def later_rounds_note() -> dict[str, Any]:
    note = {
        "checked_at": utc_now_iso(),
        "baseline_range": "65-79",
        "later_than_79": [],
        "scheduled_not_yet_published": [],
        "sources": [SCHEDULE_URL, DATAROOM_URL],
        "notes": [],
    }
    try:
        list_meta = fetch(DATAROOM_URL, referer=OFFICIAL_ORIGIN + "/")
        list_html = cache_text(list_meta)
        rounds = {parse_round_from_title(t) for t in re.findall(r"제\s*\d+\s*회", list_html)}
        later = sorted(r for r in rounds if r and r > 79)
        note["later_than_79"] = later
        if later:
            note["notes"].append("자료실 목록에 79회 이후 회차 제목이 보인다. 기준 집계와 섞지 말 것.")
        else:
            note["notes"].append("2026-09-10 점검 기준 자료실 최신 심화 공개분은 제79회이다.")
    except FetchError as exc:
        note["notes"].append(f"자료실 최신 회차 확인 실패: {exc}")
    try:
        sched_meta = fetch(SCHEDULE_URL, referer=OFFICIAL_ORIGIN + "/")
        sched = cache_text(sched_meta)
        if "제80회" in sched:
            note["scheduled_not_yet_published"].append(
                {
                    "round": 80,
                    "from_schedule_page": True,
                    "status": "scheduled_or_upcoming",
                    "evidence": "공식 시험 일정 페이지에 제80회가 기재됨. 문제지 공개 여부는 자료실과 별도.",
                }
            )
        if "제81회" in sched:
            note["scheduled_not_yet_published"].append(
                {
                    "round": 81,
                    "from_schedule_page": True,
                    "status": "scheduled_or_upcoming",
                    "evidence": "공식 시험 일정 페이지에 제81회가 기재됨.",
                }
            )
    except FetchError as exc:
        note["notes"].append(f"일정 페이지 확인 실패: {exc}")
    return note


def collect_target_rounds(rounds: list[int] | None = None) -> dict[str, Any]:
    ensure_dirs()
    rounds = rounds or TARGET_ROUNDS
    errors: list[dict[str, Any]] = []
    posts = list_dataroom_advanced()
    by_round: dict[int, dict[str, Any]] = {}
    for post in posts:
        rnd = post.get("round")
        if rnd not in rounds or not post.get("advanced"):
            continue
        if rnd in by_round:
            by_round[rnd]["duplicate_posts"] = by_round[rnd].get("duplicate_posts", []) + [post]
            continue
        by_round[rnd] = {"post": post, "duplicate_posts": []}

    objection_notices = list_objection_notices()
    objection_by_round = {n["round"]: n for n in objection_notices if n.get("round")}

    catalog_entries = []
    for rnd in reversed(list(rounds)):
        entry: dict[str, Any] = {
            "round": rnd,
            "exam_level": "advanced",
            "status": {
                "listed": rnd in by_round,
                "paper_downloaded": False,
                "key_downloaded": False,
                "web_answers": False,
                "cover_verified": False,
                "extracted": False,
                "classified": False,
                "reviewed": False,
            },
            "errors": [],
            "terms": {
                "publicly_listed_for_download": True if rnd in by_round else None,
                "app_redistribution_allowed": None,
                "app_redistribution_note": "확인하지 않음. 공개 다운로드와 앱 재배포는 별개이다.",
                "photo_copyright_note": "자료실 안내: 문항에 사용된 사진 등의 저작권은 원저작자에게 있다.",
                "evidence_urls": [DATAROOM_URL],
            },
        }
        if rnd not in by_round:
            entry["errors"].append("공식 자료실 심화 목록에서 해당 회차 게시물을 찾지 못함")
            errors.append({"round": rnd, "error": "not_listed"})
            catalog_entries.append(entry)
            continue
        post = by_round[rnd]["post"]
        entry["post"] = post
        entry["exam_date"] = post.get("posted_at")
        entry["exam_date_basis"] = "dataroom_post_date_usually_exam_day"
        try:
            view = fetch_post_view(post["post_id"])
            write_json(WEB_DIR / "collect-partial.json", {"rounds": catalog_entries, "in_progress": rnd})
            entry["view"] = {
                "url": post["view_url"],
                "html_sha256": view["html_sha256"],
                "fetched_at": view["fetched_at"],
                "has_correction_language": view["has_correction_language"],
            }
            files_out = []
            for info in view["files"]:
                dest_name = f"{rnd:02d}-{info['kind']}-{info['atch_file_id']}.pdf"
                dest = DOWNLOAD_DIR / dest_name
                try:
                    saved = download_file(info["file_url"], dest, referer=VIEW_URL)
                    rec = {**info, **saved, "git_excluded": True, "redistributable": False}
                    files_out.append(rec)
                    if info["kind"] == "question_paper" and saved["bytes"] > 0:
                        entry["status"]["paper_downloaded"] = True
                    if info["kind"] == "answer_key" and saved["bytes"] > 0:
                        entry["status"]["key_downloaded"] = True
                except FetchError as exc:
                    files_out.append({**info, "error": str(exc)})
                    entry["errors"].append(f"파일 다운로드 실패 {info['filename']}: {exc}")
            entry["files"] = files_out
        except (FetchError, OSError) as exc:
            entry["errors"].append(f"게시물 조회 실패: {exc}")
            errors.append({"round": rnd, "error": str(exc)})

        try:
            answers = fetch_web_answers(rnd)
            entry["web_answers"] = {
                "source_url": ANSWER_URL,
                "fetched_at": answers["fetched_at"],
                "html_sha256": answers["html_sha256"],
                "item_count": answers["item_count"],
                "points_sum": answers["points_sum"],
            }
            write_json(WEB_DIR / f"answers-{rnd}.json", answers)
            entry["status"]["web_answers"] = answers["item_count"] == 50
            if answers["item_count"] != 50:
                entry["errors"].append(f"웹 정답표 문항 수 {answers['item_count']} (50 아님)")
        except FetchError as exc:
            entry["errors"].append(f"웹 정답표 조회 실패: {exc}")

        notice = objection_by_round.get(rnd)
        if notice:
            detail = fetch_notice_view(notice["post_id"])
            entry["objection"] = {**notice, **detail}
        else:
            entry["objection"] = {
                "round": rnd,
                "found": False,
                "note": "공지사항 제목 검색(이의)에서 해당 회차 심사결과 게시물을 찾지 못함. 정정 없음을 단정하지 않음.",
            }

        catalog_entries.append(entry)

    sha_index: dict[str, list[str]] = {}
    for entry in catalog_entries:
        for f in entry.get("files") or []:
            digest = f.get("sha256")
            if digest:
                sha_index.setdefault(digest, []).append(f"{entry['round']}:{f.get('kind')}")
    duplicate_files = {k: v for k, v in sha_index.items() if len(v) > 1}

    later = later_rounds_note()
    write_json(WEB_DIR / "later-rounds.json", later)

    result = {
        "generated_at": utc_now_iso(),
        "origin": OFFICIAL_ORIGIN,
        "past_exam_list_url": PAST_LIST_URL,
        "dataroom_url": DATAROOM_URL,
        "target_rounds": rounds,
        "listed_advanced_posts": posts,
        "rounds": catalog_entries,
        "duplicate_file_sha256": duplicate_files,
        "later_rounds": later,
        "errors": errors,
        "tooling": {
            "collector": "scripts/exam-patterns/collect.py",
            "cache": "var/exam-patterns/cache",
            "downloads": "var/exam-patterns/downloads",
        },
    }
    write_json(WEB_DIR / "collect-result.json", result)
    return result


def build_manifest(collect_result: dict[str, Any] | None = None) -> dict[str, Any]:
    from common import RESEARCH_DIR

    collect_result = collect_result or read_json(WEB_DIR / "collect-result.json") or collect_target_rounds()
    rounds_out = []
    for entry in collect_result["rounds"]:
        paper = next((f for f in entry.get("files") or [] if f.get("kind") == "question_paper"), None)
        key = next((f for f in entry.get("files") or [] if f.get("kind") == "answer_key"), None)
        obj = entry.get("objection") or {}
        rounds_out.append(
            {
                "round": entry["round"],
                "exam_level": "advanced",
                "exam_date": entry.get("exam_date"),
                "exam_date_basis": entry.get("exam_date_basis"),
                "source_post_url": (entry.get("post") or {}).get("view_url"),
                "source_post_title": (entry.get("post") or {}).get("title"),
                "source_post_id": (entry.get("post") or {}).get("post_id"),
                "paper": _file_manifest(paper),
                "answer_key": _file_manifest(key),
                "web_answers": entry.get("web_answers"),
                "cover": {
                    "round_from_cover": None,
                    "level_from_cover": None,
                    "verified": False,
                    "method": None,
                    "note": "extract 단계에서 PDF 표지 텍스트/OCR로 채움",
                },
                "statuses": entry.get("status"),
                "errors": entry.get("errors"),
                "missing": [e for e in [
                    None if entry.get("status", {}).get("paper_downloaded") else "question_paper",
                    None if entry.get("status", {}).get("key_downloaded") else "answer_key",
                    None if entry.get("status", {}).get("web_answers") else "web_answers",
                ] if e],
                "answer_correction": {
                    "notice_found": bool(obj.get("post_id") or obj.get("found") is True),
                    "notice_url": obj.get("view_url"),
                    "notice_title": obj.get("title"),
                    "corrected": obj.get("answer_corrected"),
                    "note": obj.get("note") or obj.get("body_excerpt", "")[:240],
                },
                "terms": entry.get("terms"),
            }
        )
    manifest = {
        "schema": "arin.exam-patterns.manifest.v1",
        "analysis_version": "exam-patterns-2026-09-v1",
        "generated_at": utc_now_iso(),
        "baseline_rounds": TARGET_ROUNDS,
        "later_rounds": collect_result.get("later_rounds"),
        "duplicate_file_sha256": collect_result.get("duplicate_file_sha256"),
        "origin_priority": "국사편찬위원회 한국사능력검정시험 공식 사이트",
        "rounds": rounds_out,
    }
    write_json(RESEARCH_DIR / "manifest.json", manifest)
    return manifest


def _file_manifest(rec: dict[str, Any] | None) -> dict[str, Any] | None:
    if not rec:
        return None
    return {
        "kind": rec.get("kind"),
        "source_post_url": rec.get("file_url"),
        "file_url": rec.get("url") or rec.get("file_url"),
        "declared_filename": rec.get("declared_filename") or rec.get("filename"),
        "downloaded_at": rec.get("downloaded_at"),
        "bytes": rec.get("bytes"),
        "sha256": rec.get("sha256"),
        "local_path": rec.get("path"),
        "git_excluded": True,
        "app_bundle_excluded": True,
        "redistributable": False,
        "error": rec.get("error"),
    }


if __name__ == "__main__":
    result = collect_target_rounds()
    build_manifest(result)
    print(f"collected {len(result['rounds'])} rounds, errors={len(result['errors'])}")
