"""Heuristic auto-classification from OCR text. Does not invent facts when evidence is weak."""

from __future__ import annotations

import re
from typing import Any

from common import EXTRACT_DIR, TARGET_ROUNDS, utc_now_iso

ERA_KEYWORDS: list[tuple[str, list[str]]] = [
    ("prehistoric", ["구석기", "신석기", "청동기", "빗살무늬", "고인돌", "고조선", "위만", "8조법", "부여", "옥저", "동예", "삼한", "철기 문화"]),
    ("three-kingdoms", ["고구려", "백제", "신라", "가야", "광개토", "장수왕", "한강", "진흥왕", "근초고", "무령왕", "골품"]),
    ("north-south", ["통일신라", "발해", "대조영", "녹읍", "관료전", "원성왕", "장보고"]),
    ("goryeo", ["고려", "태조 왕건", "광종", "노비안검", "전시과", "서희", "강감찬", "무신", "삼별초", "공민왕", "정동행성"]),
    ("joseon-early", ["태종", "세종", "경국대전", "의정부", "6조", "훈민정음", "집현전", "사림", "조광조", "붕당"]),
    ("joseon-late", ["대동법", "균역법", "영조", "정조", "세도", "홍경래", "실학", "규장각", "탕평"]),
    ("opening", ["강화도", "개항", "임오군란", "갑신정변", "갑오개혁", "독립협회", "대한제국", "을사", "정미7"]),
    ("colonial", ["무단 통치", "문화 통치", "3·1", "31운동", "임시정부", "의열단", "신간회", "조선어 학회", "한인 애국단", "태형"]),
    ("modern", ["4·19", "5·16", "유신", "5·18", "6월 항쟁", "김대중", "외환 위기", "6·25", "정전", "제헌"]),
    ("culture", ["팔만대장경", "석굴암", "불국사", "금속활자", "직지", "한글", "성균관"]),
]

FORMAT_RULES: list[tuple[str, list[str]]] = [
    ("chronology-labeled", ["일어난 순서대로 배열", "(가)~(다)", "(가)→"]),
    ("chronology-events", ["일어난 순서대로 나열", "시기순"]),
    ("wrong-statement", ["옳지 않은 것은", "틀린 것은"]),
    ("source-underline", ["밑줄 친", "㉠"]),
    ("map-region", ["지도", "다음 지역", "진출로", "천도"]),
    ("king-compare", ["비교한 것으로", "공통점으로"]),
    ("policy-name", ["제도의 명칭", "명칭으로 옳은"]),
    ("heritage-period", ["문화유산", "조성된 시기", "유물"]),
    ("org-activity", ["단체의 활동", "단체의 성격"]),
    ("cause-effect", ["영향으로", "배경으로", "결과로"]),
    ("source-who", ["인물로 옳은", "왕으로 옳은"]),
    ("source-what", ["가리키는 것으로", "자료의 상황"]),
]

STIMULUS_RULES: list[tuple[str, list[str]]] = [
    ("map", ["지도", "(지도)", "다음 지도"]),
    ("timeline", ["연표", "(연표)", "연표의"]),
    ("table", ["표와 같다", "다음 표", "(표)"]),
    ("dialogue", ["대화", "학생의 질문", "교사의 질문"]),
    ("photo", ["사진", "유적", "유물 사진"]),
    ("text_source", ["사료", "문헌", "다음 자료"]),
    ("instructional_text", ["탐방", "안내문", "신문", "학습 자료"]),
]

SKILL_FROM_FORMAT = {
    "chronology-events": "chronology",
    "chronology-labeled": "chronology",
    "source-who": "source_analysis",
    "source-what": "source_analysis",
    "source-underline": "source_analysis",
    "map-region": "source_analysis",
    "heritage-period": "historical_knowledge",
    "policy-name": "historical_knowledge",
    "policy-content": "historical_knowledge",
    "king-policy-match": "historical_knowledge",
    "king-compare": "conclusion_evaluation",
    "wrong-statement": "situation_issue",
    "org-activity": "historical_knowledge",
    "cause-effect": "chronology",
}


def _hits(text: str, keywords: list[str]) -> list[str]:
    return [k for k in keywords if k and k in text]


def classify_text(text: str) -> dict[str, Any]:
    if not text or len(text.strip()) < 12:
        return {"ok": False, "reason": "insufficient_text"}
    era_scores = []
    for era, kws in ERA_KEYWORDS:
        found = _hits(text, kws)
        if found:
            era_scores.append((len(found), era, found))
    era_scores.sort(reverse=True)
    primary = era_scores[0][1] if era_scores else None
    secondary = [e for _, e, _ in era_scores[1:3]]
    fmt = None
    for fid, kws in FORMAT_RULES:
        if _hits(text, kws):
            fmt = fid
            break
    stim = []
    for sid, kws in STIMULUS_RULES:
        if _hits(text, kws):
            stim.append(sid)
    visual_guess = None
    if any(s in stim for s in ("map", "photo", "timeline", "table")):
        visual_guess = None  # require rendered review; do not auto-confirm
        visual_hint = True
    else:
        visual_hint = False
    skill = SKILL_FROM_FORMAT.get(fmt) if fmt else None
    return {
        "ok": True,
        "primary_era": primary,
        "secondary_eras": secondary,
        "internal_format_id": fmt,
        "stimulus_hints": stim,
        "visual_hint": visual_hint,
        "official_skill_type_estimate": skill,
        "uncertainty": "high" if not era_scores or not fmt else "medium",
        "basis": "ocr_keyword_heuristic",
    }


def apply_auto_classification(items: list[dict[str, Any]], ocr_by_item: dict[str, str]) -> list[dict[str, Any]]:
    now = utc_now_iso()
    for it in items:
        # never overwrite overlay-backed fields
        review = it.get("review") or {}
        text = ocr_by_item.get(it["id"])
        if not text:
            continue
        result = classify_text(text)
        if not result.get("ok"):
            continue
        it["statuses"]["auto_classified"] = True
        def fill(field: str, value, note: str | None = None):
            status = (review.get(field) or {}).get("status") or "unreviewed"
            if status in {"ai_source_check", "human"}:
                return
            if value is None or value == []:
                return
            it[field] = value
            it["review"][field] = {"status": "auto", "by": "keyword-heuristic", "at": now, "note": note}

        fill("primary_era", result.get("primary_era"), result.get("basis"))
        fill("secondary_eras", result.get("secondary_eras"))
        fill("internal_format_id", result.get("internal_format_id"))
        fill("official_skill_type_estimate", result.get("official_skill_type_estimate"), "공식 문항별 유형 미공개. 내부 추정.")
        if result.get("stimulus_hints"):
            fill("stimulus_types", result["stimulus_hints"], "텍스트 키워드 힌트. 시각 필수 여부는 미확인으로 남김.")
        fill("classification_basis", result.get("basis"))
        it["uncertainty"] = result.get("uncertainty")
        if it.get("primary_era"):
            from common import period_block_for_era

            it["period_block"] = period_block_for_era(it["primary_era"])
            status = (review.get("primary_era") or {}).get("status") or "auto"
            if status not in {"ai_source_check", "human"}:
                it["review"]["period_block"] = {"status": "auto", "by": "keyword-heuristic", "at": now, "note": "derived_from_primary_era"}
    return items


def classify_from_local_regions(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keyword auto-class from local stem windows. Does not write official text into items."""
    import json

    ocr_by_item: dict[str, str] = {}
    index = {(it["round"], it["number"]): it for it in items}
    for rnd in TARGET_ROUNDS:
        path = EXTRACT_DIR / f"{rnd:02d}-item-regions.json"
        if not path.exists() or path.stat().st_size == 0:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        method = data.get("method")
        for row in data.get("items") or []:
            number = int(row["number"])
            text = row.get("text") or ""
            if text and len(text) >= 12:
                ocr_by_item[f"adv-{rnd:02d}-{number:02d}"] = text
            it = index.get((rnd, number))
            if it and it["source"].get("page") is None:
                it["source"]["page"] = row.get("page")
                it["source"]["bbox"] = row.get("bbox")
                it["source"]["column"] = row.get("column")
                it["source"]["region_method"] = method
    return apply_auto_classification(items, ocr_by_item)


def classify(items: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    from common import RESEARCH_DIR, read_jsonl, write_jsonl
    from overlays import apply_overlays, load_overlays

    items = items if items is not None else read_jsonl(RESEARCH_DIR / "items.jsonl")
    items = classify_from_local_regions(items)
    items = apply_overlays(items, load_overlays())
    write_jsonl(RESEARCH_DIR / "items.jsonl", items)
    return items
