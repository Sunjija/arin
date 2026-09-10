"""Aggregate observed distributions. Never coerce missing values to zero."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from common import (
    ANALYSIS_VERSION,
    CODEBOOK_VERSION,
    ITEMS_PER_ROUND,
    TARGET_ITEM_COUNT,
    TARGET_ROUNDS,
    utc_now_iso,
)

DEFAULT_WEIGHTS = {
    "recent_count": 5,
    "recent_weight": 2.0,
    "older_weight": 1.0,
    "rationale": (
        "다가올 시험에 가까운 최근 5회를 2배로 두되, "
        "한 회의 특수 구성이 목표를 과도하게 흔들지 않게 이전 10회는 1로 둔다. "
        "균등 가중 결과도 항상 함께 제공한다."
    ),
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def round_weight(round_no: int, rounds: list[int], cfg: dict[str, Any]) -> float:
    ordered = sorted(rounds, reverse=True)
    recent = set(ordered[: int(cfg.get("recent_count") or 5)])
    return float(cfg["recent_weight"] if round_no in recent else cfg["older_weight"])


def complete_extracted(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [it for it in items if it.get("points") is not None and it.get("answer") is not None]


def classified_for(items: list[dict[str, Any]], field: str, min_status: str = "auto") -> list[dict[str, Any]]:
    rank = {"unreviewed": 0, "auto": 1, "ai_source_check": 2, "human": 3}
    need = rank[min_status]
    out = []
    for it in items:
        value = it.get(field)
        empty = value is None or value == [] or value == ""
        status = ((it.get("review") or {}).get(field) or {}).get("status") or "unreviewed"
        if empty:
            continue
        if rank.get(status, 0) >= need:
            out.append(it)
    return out


def count_map(values: list[Any], *, multi: bool) -> dict[str, int]:
    c: Counter[str] = Counter()
    for value in values:
        if multi:
            for part in value or []:
                if part is not None:
                    c[str(part)] += 1
        elif value is not None:
            c[str(value)] += 1
    return dict(c)


def weighted_count_map(
    items: list[dict[str, Any]],
    field: str,
    weight_of,
    *,
    multi: bool,
) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)
    for it in items:
        w = float(weight_of(it["round"]))
        value = it.get(field)
        if multi:
            for part in value or []:
                if part is not None:
                    totals[str(part)] += w
        elif value is not None:
            totals[str(value)] += w
    return dict(totals)


def distribution_block(
    items: list[dict[str, Any]],
    field: str,
    *,
    multi: bool,
    rounds: list[int],
    min_status: str,
    weights: dict[str, Any],
    target_item_count: int,
) -> dict[str, Any]:
    eligible = classified_for(items, field, min_status)
    missing = len(items) - len(eligible)
    equal_counts = count_map([it.get(field) for it in eligible], multi=multi)
    equal_denom = len(eligible) if not multi else None
    weight_fn = lambda rnd: round_weight(rnd, rounds, weights)
    recent_counts = weighted_count_map(eligible, field, weight_fn, multi=multi)
    equal_weight_sum = float(len(eligible))
    recent_weight_sum = sum(weight_fn(it["round"]) for it in eligible)

    def ratios(counts: dict[str, Any], denom: float | None) -> dict[str, float] | None:
        if not denom:
            return None
        return {k: (v / denom) for k, v in counts.items()}

    return {
        "field": field,
        "kind": "multi" if multi else "single",
        "min_review_status": min_status,
        "rounds": rounds,
        "included_items": len(eligible),
        "universe_items": len(items),
        "target_item_count": target_item_count,
        "missing_or_unclassified": missing,
        "review_level": min_status,
        "generated_at": _now(),
        "data_version": ANALYSIS_VERSION,
        "codebook_version": CODEBOOK_VERSION,
        "equal_weight": {
            "counts": equal_counts,
            "denominator": equal_denom if equal_denom is not None else "item-occurrences; shares may exceed 1.0",
            "share_of_included": ratios(equal_counts, float(len(eligible)) if eligible else None),
        },
        "recent_weight": {
            "config": weights,
            "weighted_counts": recent_counts,
            "weighted_denominator": recent_weight_sum or None,
            "share_of_included": ratios(recent_counts, recent_weight_sum or None),
        },
        "confirmed_available": len(classified_for(items, field, "ai_source_check")) > 0
        or len(classified_for(items, field, "human")) > 0,
        "note": None
        if eligible
        else "이 지표의 확정·자동 분류 표본이 없어 관측 분포를 제공하지 않는다. 결측을 0으로 채우지 않았다.",
    }


def points_by_round(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    extracted = complete_extracted(items)
    by_round: dict[int, list] = defaultdict(list)
    for it in extracted:
        by_round[it["round"]].append(it)
    for rnd in TARGET_ROUNDS:
        subset = by_round.get(rnd) or []
        band = Counter(it["points"] for it in subset)
        rows.append(
            {
                "round": rnd,
                "extracted_items": len(subset),
                "target_items": ITEMS_PER_ROUND,
                "missing": ITEMS_PER_ROUND - len(subset),
                "points_1": band.get(1),
                "points_2": band.get(2),
                "points_3": band.get(3),
                "points_sum": sum(it["points"] for it in subset) if subset else None,
                "complete": len(subset) == ITEMS_PER_ROUND,
            }
        )
    return rows


def concept_cooccurrence(items: list[dict[str, Any]], min_status: str = "auto") -> list[dict[str, Any]]:
    eligible = classified_for(items, "core_concepts", min_status)
    pair_counts: Counter[tuple[str, str]] = Counter()
    for it in eligible:
        concepts = sorted({c for c in (it.get("core_concepts") or []) if c})
        for i, a in enumerate(concepts):
            for b in concepts[i + 1 :]:
                pair_counts[(a, b)] += 1
    return [
        {"a": a, "b": b, "count": n, "included_items": len(eligible)}
        for (a, b), n in pair_counts.most_common(40)
    ]


def distractor_patterns(items: list[dict[str, Any]], min_status: str = "auto") -> dict[str, Any]:
    eligible = classified_for(items, "distractor_strategy", min_status)
    counts = count_map([it.get("distractor_strategy") for it in eligible], multi=False)
    return {
        "included_items": len(eligible),
        "counts": counts,
        "note": "출제 빈도는 개인 취약도·복습 주기와 다른 값이다.",
    }


def visual_required_share(items: list[dict[str, Any]], min_status: str = "ai_source_check") -> dict[str, Any]:
    eligible = classified_for(items, "visual_required", min_status)
    if not eligible:
        return {
            "included_items": 0,
            "share": None,
            "note": "원본 렌더링을 확인한 문항이 없어 시각 자료 필수 비중을 확정하지 않는다.",
        }
    yes = sum(1 for it in eligible if it.get("visual_required") is True)
    return {"included_items": len(eligible), "visual_required_true": yes, "share": yes / len(eligible)}


def reasoning_by_points(items: list[dict[str, Any]], min_status: str = "auto") -> dict[str, Any]:
    eligible = [it for it in classified_for(items, "reasoning_steps", min_status) if it.get("points") is not None]
    grid: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for it in eligible:
        grid[str(it["points"])][str(it["reasoning_steps"])] += 1
    return {"included_items": len(eligible), "points_x_steps": {p: dict(v) for p, v in grid.items()}}


def range_split(
    items: list[dict[str, Any]],
    field: str,
    *,
    multi: bool,
    weights: dict[str, Any],
    min_status: str = "auto",
) -> dict[str, Any]:
    all_rounds = TARGET_ROUNDS
    recent = sorted(all_rounds, reverse=True)[: int(weights.get("recent_count") or 5)]
    older = [r for r in all_rounds if r not in recent]
    full = [it for it in items if it["round"] in all_rounds]
    rec = [it for it in items if it["round"] in recent]
    return {
        "full_65_79": distribution_block(full, field, multi=multi, rounds=all_rounds, min_status=min_status, weights=weights, target_item_count=TARGET_ITEM_COUNT),
        "recent": distribution_block(rec, field, multi=multi, rounds=recent, min_status=min_status, weights=weights, target_item_count=len(recent) * ITEMS_PER_ROUND),
        "older": distribution_block(
            [it for it in items if it["round"] in older],
            field,
            multi=multi,
            rounds=older,
            min_status=min_status,
            weights=weights,
            target_item_count=len(older) * ITEMS_PER_ROUND,
        ),
        "caveat": "표본이 적거나 회차 간 변동이 크면 추세로 단정하지 않는다. 공식 출제 비율이 아니라 확보한 공식 기출의 관측 분포이다.",
    }


def _weight_sensitivity(items: list[dict[str, Any]], field: str, weights: dict[str, Any]) -> dict[str, Any]:
    block = distribution_block(
        items,
        field,
        multi=False,
        rounds=TARGET_ROUNDS,
        min_status="auto",
        weights=weights,
        target_item_count=TARGET_ITEM_COUNT,
    )
    eq = (block.get("equal_weight") or {}).get("share_of_included") or {}
    wt = (block.get("recent_weight") or {}).get("share_of_included") or {}
    keys = sorted(set(eq) | set(wt))
    delta = {k: (wt.get(k, 0) - eq.get(k, 0)) for k in keys} if eq and wt else None
    alloc_eq = hamilton_apportion(eq, 50) if eq else None
    alloc_wt = hamilton_apportion(wt, 50) if wt else None
    return {
        "field": field,
        "included_items": block["included_items"],
        "equal_share": eq or None,
        "recent_share": wt or None,
        "recent_minus_equal": delta,
        "hamilton_50_equal": alloc_eq,
        "hamilton_50_recent": alloc_wt,
        "formula": weights,
        "note": "가중치를 바꾸면 50문항 정수 배분이 달라질 수 있다. 균등 가중 결과는 항상 함께 둔다.",
    }


def hamilton_apportion(shares: dict[str, float], total: int) -> dict[str, int]:
    if not shares or total <= 0:
        return {k: 0 for k in shares}
    s = sum(shares.values())
    if s <= 0:
        return {k: 0 for k in shares}
    raw = {k: total * v / s for k, v in shares.items()}
    floors = {k: int(v) for k, v in raw.items()}
    remain = total - sum(floors.values())
    order = sorted(raw, key=lambda k: (raw[k] - floors[k], shares[k], k), reverse=True)
    for k in order[:remain]:
        floors[k] += 1
    return floors


def blueprint_candidates(dist: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
    extracted = complete_extracted(items)
    complete_rounds = []
    by_round = defaultdict(list)
    for it in extracted:
        by_round[it["round"]].append(it)
    for rnd, subset in by_round.items():
        if len(subset) == 50 and sum(x["points"] for x in subset) == 100:
            complete_rounds.append(rnd)

    era_confirmed = ((dist.get("primary_era_confirmed") or {}).get("recent") or {}).get("equal_weight") or {}
    era_auto = ((dist.get("primary_era") or {}).get("recent") or {}).get("equal_weight") or {}
    era_shares_confirmed = era_confirmed.get("share_of_included") or {}
    era_shares_auto = era_auto.get("share_of_included") or {}
    era_alloc = hamilton_apportion(era_shares_confirmed, 50) if era_shares_confirmed else None
    era_alloc_auto = hamilton_apportion(era_shares_auto, 50) if era_shares_auto else None

    skill_confirmed = ((dist.get("official_skill_type_estimate_confirmed") or {}).get("recent") or {}).get("equal_weight") or {}
    skill_auto = ((dist.get("official_skill_type_estimate") or {}).get("recent") or {}).get("equal_weight") or {}
    skill_alloc = (
        hamilton_apportion(skill_confirmed.get("share_of_included") or {}, 50)
        if skill_confirmed.get("share_of_included")
        else None
    )

    stim_recent = ((dist.get("stimulus_types") or {}).get("recent") or {}).get("equal_weight") or {}

    extracted_ai = classified_for(items, "primary_era", "ai_source_check")
    confidence = "low"
    if len(extracted_ai) >= 50:
        confidence = "medium"
    if len(classified_for(items, "primary_era", "human")) >= 50:
        confidence = "high"
    if not era_shares_confirmed:
        confidence = "low" if era_shares_auto else "none"

    return {
        "schema": "arin.exam-patterns.blueprint.v1",
        "label": "observed_official_advanced_distribution_candidate",
        "not_official_blueprint": True,
        "generated_at": utc_now_iso(),
        "data_version": ANALYSIS_VERSION,
        "evidence_rounds": sorted(complete_rounds),
        "classification_evidence_rounds": sorted({it["round"] for it in extracted_ai}),
        "confidence": confidence,
        "evidence_note": (
            "배점 10·30·10은 65~79회 정답표 15개에서 확인했다. "
            "시대·평가 능력·자료 유형의 자동 추정은 텍스트 추출이 된 회차와 키워드 규칙에 의존한다. "
            "AI 원본 대조가 끝난 회차는 현재 제79회 50문항이다. "
            "사람 검수는 0이다. 65~78회 전체를 확정 시대로 쓰지 말 것."
        ),
        "must": {
            "item_count": 50,
            "choices": 5,
            "points_total": 100,
            "points_quota": {"1": 10, "2": 30, "3": 10},
            "basis": "공식 요강(50문항 5지 택1, 1~3점 차등, 100점)과 확보한 15개 심화 정답표에서 반복 관측된 10·30·10.",
        },
        "strong": {
            "era_allocation_50": era_alloc,
            "era_shares_recent_confirmed": era_shares_confirmed,
            "rounding": "largest_remainder_hamilton",
            "tolerance_note": "허용 오차는 제품 선택이 아니라, 회차 완전체에서 관측된 편차를 별도 필드로 둔다.",
            "basis": "ai_source_check 이상만. 키워드 자동 분류는 estimated_auto에 둔다.",
        },
        "estimated_auto": {
            "era_allocation_50": era_alloc_auto,
            "era_shares_recent_auto": era_shares_auto,
            "skill_shares_recent_auto": skill_auto.get("share_of_included"),
            "note": "텍스트 추출+키워드 휴리스틱. 확정 통계가 아니다.",
        },
        "flexible": {
            "skill_allocation_50": skill_alloc,
            "stimulus_share_recent": stim_recent.get("share_of_included"),
            "stimulus_is_multi": True,
        },
        "conflicts": [
            "시대·평가능력·자료유형 목표를 동시에 정수로 맞추면 해가 없을 수 있다. 그 경우 must(배점·문항수)를 우선하고 strong(시대)을 다음으로 두며 flexible은 완화한다.",
            "주변 분포를 각각 맞춰도 실제 회차의 문항 배열(앞쪽 전근대, 뒤쪽 근현대 등)이 재현된다고 가정하지 않는다.",
        ],
        "per_round_points": dist.get("points_by_round"),
        "weight_formula": dist.get("weights"),
    }


def aggregate(items: list[dict[str, Any]], weights: dict[str, Any] | None = None) -> dict[str, Any]:
    weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    extracted = complete_extracted(items)
    dist = {
        "generated_at": utc_now_iso(),
        "data_version": ANALYSIS_VERSION,
        "codebook_version": CODEBOOK_VERSION,
        "label": "observed_distribution_of_acquired_official_advanced_items",
        "not_official_ratio": True,
        "weights": weights,
        "universe": {
            "target_rounds": TARGET_ROUNDS,
            "target_items": TARGET_ITEM_COUNT,
            "extracted_items": len(extracted),
            "auto_classified_items": sum(1 for it in items if it["statuses"].get("auto_classified")),
            "ai_source_checked_items": sum(1 for it in items if it["statuses"].get("ai_source_checked")),
            "human_reviewed_items": sum(1 for it in items if it["statuses"].get("human_reviewed")),
        },
        "points_by_round": points_by_round(items),
        "primary_era": range_split(items, "primary_era", multi=False, weights=weights),
        "primary_era_confirmed": range_split(items, "primary_era", multi=False, weights=weights, min_status="ai_source_check"),
        "period_block": range_split(items, "period_block", multi=False, weights=weights),
        "official_skill_type_estimate": range_split(items, "official_skill_type_estimate", multi=False, weights=weights),
        "official_skill_type_estimate_confirmed": range_split(
            items, "official_skill_type_estimate", multi=False, weights=weights, min_status="ai_source_check"
        ),
        "internal_format_id": range_split(items, "internal_format_id", multi=False, weights=weights),
        "stimulus_types": range_split(items, "stimulus_types", multi=True, weights=weights),
        "visual_required": visual_required_share(items),
        "reasoning_by_points": reasoning_by_points(items),
        "concept_cooccurrence": concept_cooccurrence(items),
        "distractor_patterns": distractor_patterns(items),
        "weight_sensitivity_primary_era": _weight_sensitivity(items, "primary_era", weights),
        "stale_if_items_hash_changes": True,
    }
    return dist
