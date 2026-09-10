"""Shared paths, constants, and JSON helpers for exam-pattern research."""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_DIR = REPO_ROOT / "research" / "exam-patterns"
SCRIPTS_DIR = Path(__file__).resolve().parent
VAR_DIR = Path(os.environ.get("EXAM_PATTERNS_VAR", REPO_ROOT / "var" / "exam-patterns"))

CACHE_DIR = VAR_DIR / "cache"
DOWNLOAD_DIR = VAR_DIR / "downloads"
OCR_DIR = VAR_DIR / "ocr"
PAGES_DIR = VAR_DIR / "pages"
EXTRACT_DIR = VAR_DIR / "extracts"
WEB_DIR = VAR_DIR / "web"

ANALYSIS_VERSION = "exam-patterns-2026-09-v1"
CODEBOOK_VERSION = "2026-09-v1"
TARGET_ROUNDS = list(range(65, 80))
ITEMS_PER_ROUND = 50
TARGET_ITEM_COUNT = len(TARGET_ROUNDS) * ITEMS_PER_ROUND
EXAM_LEVEL = "advanced"

OFFICIAL_ORIGIN = "https://www.historyexam.go.kr"
LIST_URL = f"{OFFICIAL_ORIGIN}/pst/list.do?bbs=dat"
VIEW_URL = f"{OFFICIAL_ORIGIN}/pst/view.do?bbs=dat"
FILE_URL = f"{OFFICIAL_ORIGIN}/atchFile/FileDown.do"
ANSWER_URL = f"{OFFICIAL_ORIGIN}/answer/list.do"
NOTICE_LIST_URL = f"{OFFICIAL_ORIGIN}/pst/list.do?bbs=noti"
NOTICE_VIEW_URL = f"{OFFICIAL_ORIGIN}/pst/view.do?bbs=noti"
EVAL_TYPES_URL = f"{OFFICIAL_ORIGIN}/pageLink.do?link=examInfo"
GUIDELINE_URL = f"{OFFICIAL_ORIGIN}/pageLink.do?link=examGuideline"
DATAROOM_URL = f"{OFFICIAL_ORIGIN}/pst/list.do?bbs=dat"
PAST_LIST_URL = f"{OFFICIAL_ORIGIN}/pageLink.do?link=exam/pastExamList"
SCHEDULE_URL = f"{OFFICIAL_ORIGIN}/pageLink.do?link=examSchedule"

# Official web form: testlevel 1 = 심화, 3 = 기본
WEB_LEVEL_ADVANCED = "1"
WEB_LEVEL_BASIC = "3"

USER_AGENT = (
    "Mozilla/5.0 (compatible; arin-exam-pattern-research/1.0; "
    "+https://github.com/Sunjija/arin)"
)

ERA_IDS = [
    "prehistoric",
    "three-kingdoms",
    "north-south",
    "goryeo",
    "joseon-early",
    "joseon-late",
    "opening",
    "colonial",
    "modern",
    "culture",
]
PREMODERN_ERAS = {
    "prehistoric",
    "three-kingdoms",
    "north-south",
    "goryeo",
    "joseon-early",
    "joseon-late",
}
MODERN_ERAS = {"opening", "colonial", "modern"}
# culture is tagged separately; period_block uses primary non-culture era when possible.

OFFICIAL_SKILL_TYPES = [
    "historical_knowledge",  # 역사 지식의 이해
    "chronology",  # 연대기의 파악
    "situation_issue",  # 역사 상황 및 쟁점의 인식
    "source_analysis",  # 역사 자료의 분석 및 해석
    "inquiry_design",  # 역사 탐구의 설계 및 수행
    "conclusion_evaluation",  # 결론의 도출 및 평가
]

INTERNAL_FORMAT_IDS = [
    "source-who",
    "source-what",
    "source-underline",
    "chronology-events",
    "chronology-labeled",
    "king-policy-match",
    "king-compare",
    "policy-name",
    "policy-content",
    "wrong-statement",
    "org-activity",
    "heritage-period",
    "cause-effect",
    "map-region",
]

STIMULUS_TYPES = [
    "text_source",
    "instructional_text",
    "photo",
    "map",
    "timeline",
    "table",
    "dialogue",
    "composite",
    "none",
]

REVIEW_STATUSES = ["unreviewed", "auto", "ai_source_check", "human"]
SINGLE_COUNT_FIELDS = [
    "primary_era",
    "official_skill_type_estimate",
    "internal_format_id",
    "points",
]
MULTI_COUNT_FIELDS = ["stimulus_types", "secondary_eras", "core_concepts"]

CIRCLED_DIGITS = {
    "①": 1,
    "②": 2,
    "③": 3,
    "④": 4,
    "⑤": 5,
    "❶": 1,
    "❷": 2,
    "❸": 3,
    "❹": 4,
    "❺": 5,
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_dirs() -> None:
    for path in (
        RESEARCH_DIR,
        RESEARCH_DIR / "sources",
        RESEARCH_DIR / "handoff",
        RESEARCH_DIR / "overlays",
        CACHE_DIR,
        DOWNLOAD_DIR,
        OCR_DIR,
        PAGES_DIR,
        EXTRACT_DIR,
        WEB_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def item_id(round_no: int, number: int) -> str:
    return f"adv-{round_no:02d}-{number:02d}"


def parse_round_from_title(title: str) -> int | None:
    match = re.search(r"제\s*(\d+)\s*회", title)
    if not match:
        return None
    return int(match.group(1))


def title_looks_advanced(title: str) -> bool:
    if "기본" in title:
        return False
    return "심화" in title


def title_looks_basic(title: str) -> bool:
    return "기본" in title and "심화" not in title


def period_block_for_era(era: str | None) -> str | None:
    if era is None:
        return None
    if era in PREMODERN_ERAS:
        return "premodern"
    if era in MODERN_ERAS:
        return "modern"
    if era == "culture":
        return "culture"
    return None


def empty_review_map() -> dict[str, dict[str, Any]]:
    fields = [
        "points",
        "answer",
        "primary_era",
        "topic",
        "official_skill_type_estimate",
        "internal_format_id",
        "stimulus_types",
        "visual_required",
        "reasoning_steps",
        "distractor_strategy",
        "core_concepts",
    ]
    return {field: {"status": "unreviewed", "by": None, "at": None, "note": None} for field in fields}


def blank_item(round_no: int, number: int) -> dict[str, Any]:
    return {
        "id": item_id(round_no, number),
        "round": round_no,
        "number": number,
        "exam_level": EXAM_LEVEL,
        "points": None,
        "answer": None,
        "answer_labels": [],
        "answer_corrections": [],
        "choice_count": None,
        "primary_era": None,
        "secondary_eras": [],
        "period_block": None,
        "topic": None,
        "core_concepts": [],
        "people": [],
        "events": [],
        "institutions": [],
        "official_skill_type_estimate": None,
        "official_skill_type_scope": "internal_estimate_from_official_definitions",
        "internal_format_id": None,
        "stimulus_types": [],
        "visual_required": None,
        "visual_required_reason": None,
        "reasoning_steps": None,
        "solution_sketch": None,
        "distractor_strategy": None,
        "confused_concepts": [],
        "answer_target_exposed_in_stem": None,
        "classification_basis": None,
        "uncertainty": None,
        "observed_correct_rate": None,
        "observed_discrimination": None,
        "ai_cognitive_load": None,
        "source": {
            "paper_sha256": None,
            "key_sha256": None,
            "web_answer_sha256": None,
            "page": None,
            "bbox": None,
            "extract_method": None,
        },
        "review": empty_review_map(),
        "statuses": {
            "acquired": False,
            "extracted": False,
            "auto_classified": False,
            "ai_source_checked": False,
            "human_reviewed": False,
        },
        "analysis_version": ANALYSIS_VERSION,
        "codebook_version": CODEBOOK_VERSION,
    }
