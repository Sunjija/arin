"""Markdown + standalone HTML report. Does not embed official PDFs or page images."""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

from common import RESEARCH_DIR, utc_now_iso


def _pct(x: float | None) -> str:
    if x is None:
        return "—"
    return f"{100 * x:.1f}%"


def render_markdown(
    manifest: dict[str, Any],
    coverage: dict[str, Any],
    dist: dict[str, Any],
    validation: dict[str, Any],
    blueprint: dict[str, Any],
) -> str:
    lines = [
        "# 한능검 심화 기출 패턴 분석 보고",
        "",
        f"> 생성: {utc_now_iso()} · 데이터 버전 `{dist.get('data_version')}`",
        "> 이 수치는 **공식 출제 비율**이 아니라, 확보한 공식 심화 기출을 분석한 **관측 분포**이다.",
        "",
        "## 1. 확보·추출·검토 현황",
        "",
        f"- 대상 범위: 심화 65~79회 (750문항). 79회 이후 공개분은 기준 집계에 섞지 않음.",
        f"- 추출 완료(정답·배점): {coverage.get('extracted_items')}",
        f"- 자동 분류: {coverage.get('auto_classified_items')}",
        f"- AI 원본 대조: {coverage.get('ai_source_checked_items')}",
        f"- 사람 검수: {coverage.get('human_reviewed_items')}",
        f"- 검증: {'통과' if validation.get('ok') else '오류 있음'} (error {validation.get('error_count')}, warning {validation.get('warning_count')})",
        "",
        "| 회차 | 시행일(자료실 등록일) | 문제지 | 정답표 | 웹정답 | 표지검증 | 정정 |",
        "|---:|---|---|---|---|---|---|",
    ]
    for rnd in manifest.get("rounds") or []:
        st = rnd.get("statuses") or {}
        corr = rnd.get("answer_correction") or {}
        corr_s = {True: "정정 있음", False: "원안 확정", None: "미확인"}.get(corr.get("corrected"), "미확인")
        lines.append(
            f"| {rnd['round']} | {rnd.get('exam_date') or '—'} | "
            f"{'Y' if st.get('paper_downloaded') else 'N'} | "
            f"{'Y' if st.get('key_downloaded') else 'N'} | "
            f"{'Y' if st.get('web_answers') else 'N'} | "
            f"{'Y' if (rnd.get('cover') or {}).get('verified') else 'N'} | {corr_s} |"
        )
    later = manifest.get("later_rounds") or {}
    lines += [
        "",
        "## 2. 79회 이후",
        "",
        json.dumps(later, ensure_ascii=False, indent=2),
        "",
        "## 3. 배점 관측",
        "",
        "| 회차 | 추출 | 1점 | 2점 | 3점 | 합계 | 완결 |",
        "|---:|---:|---:|---:|---:|---:|---|",
    ]
    for row in dist.get("points_by_round") or []:
        lines.append(
            f"| {row['round']} | {row['extracted_items']} | {row['points_1'] if row['points_1'] is not None else '—'} | "
            f"{row['points_2'] if row['points_2'] is not None else '—'} | {row['points_3'] if row['points_3'] is not None else '—'} | "
            f"{row['points_sum'] if row['points_sum'] is not None else '—'} | {'Y' if row['complete'] else 'N'} |"
        )
    era = ((dist.get("primary_era") or {}).get("full_65_79") or {}).get("equal_weight") or {}
    era_conf = ((dist.get("primary_era_confirmed") or {}).get("full_65_79") or {}).get("equal_weight") or {}
    lines += [
        "",
        "## 4. 시대 관측 분포 (분류된 문항만, 분모=included)",
        "",
        "자동 분류와 AI 원본 대조 통계를 분리한다. 아래 표는 자동 이상(`auto`) 표본의 전체 범위 균등 가중.",
        "",
        f"- auto included={((dist.get('primary_era') or {}).get('full_65_79') or {}).get('included_items')} "
        f"/ universe={((dist.get('primary_era') or {}).get('full_65_79') or {}).get('universe_items')}",
        f"- confirmed (ai_source_check+) included={((dist.get('primary_era_confirmed') or {}).get('full_65_79') or {}).get('included_items')}",
        "",
    ]
    shares = era.get("share_of_included") or {}
    if not shares:
        lines.append("확정·자동 분류 표본이 없어 시대 비율을 제시하지 않는다.")
    else:
        lines.append("| 시대 | 자동 이상 관측 비중 | 원본 대조 비중 |")
        lines.append("|---|---:|---:|")
        conf_shares = era_conf.get("share_of_included") or {}
        for k, v in sorted(shares.items(), key=lambda kv: -kv[1]):
            lines.append(f"| {k} | {_pct(v)} | {_pct(conf_shares.get(k))} |")
    lines += [
        "",
        "## 5. 근거가 부족한 항목",
        "",
        "- 정답률·변별도: 공식 통계·실사용 데이터가 없어 추정하지 않음 (`null`).",
        "- 공식 문항별 평가유형: 미공개. 내부 추정만 기록.",
        "- 시각 자료 필수 여부: 원본 렌더링을 확인하지 않은 문항은 보류.",
        "- 사람 검수: 이번 작업에서 수행하지 않음.",
        "",
        "## 6. 모의고사 블루프린트 후보",
        "",
        f"- 신뢰 수준: {blueprint.get('confidence')}",
        f"- must: {json.dumps(blueprint.get('must'), ensure_ascii=False)}",
        "",
        "## 7. 재실행",
        "",
        "```bash",
        "python3 scripts/exam-patterns/run.py all",
        "python3 scripts/exam-patterns/run.py test",
        "```",
        "",
    ]
    return "\n".join(lines) + "\n"


def render_html(manifest: dict[str, Any], coverage: dict[str, Any], dist: dict[str, Any], validation: dict[str, Any]) -> str:
    payload = json.dumps(
        {"manifest": manifest, "coverage": coverage, "distributions": dist, "validation": validation},
        ensure_ascii=False,
    ).replace("<", "\\u003c")
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>한능검 심화 기출 패턴 분석</title>
  <style>
    body {{ font-family: sans-serif; margin: 24px; color: #222; background: #fafafa; }}
    h1,h2 {{ font-weight: 700; }}
    table {{ border-collapse: collapse; background: #fff; margin: 12px 0; }}
    th, td {{ border: 1px solid #ddd; padding: 6px 10px; font-size: 14px; }}
    th {{ background: #f0f3f8; }}
    .note {{ color: #555; max-width: 72ch; }}
    .bad {{ color: #a40000; }}
    .ok {{ color: #0b6; }}
    code {{ background: #eee; padding: 1px 4px; }}
  </style>
</head>
<body>
  <h1>한능검 심화 기출 패턴 분석</h1>
  <p class="note">공식 출제 비율이 아니라, 확보한 공식 심화 기출의 관측 분포이다. 원문 PDF·문제지 이미지는 이 페이지에 넣지 않는다.</p>
  <div id="app">불러오는 중…</div>
  <script type="application/json" id="data">{payload}</script>
  <script>
    const data = JSON.parse(document.getElementById('data').textContent);
    const pct = (x) => x == null ? '—' : (100*x).toFixed(1) + '%';
    const yn = (v) => v ? 'Y' : 'N';
    const rounds = (data.manifest.rounds || []).map(r => {{
      const st = r.statuses || {{}};
      const corr = (r.answer_correction || {{}}).corrected;
      const corrS = corr === true ? '정정' : corr === false ? '원안' : '미확인';
      return `<tr>
        <td>${{r.round}}</td><td>${{r.exam_date || '—'}}</td>
        <td>${{yn(st.paper_downloaded)}}</td><td>${{yn(st.key_downloaded)}}</td>
        <td>${{yn(st.web_answers)}}</td><td>${{yn((r.cover||{{}}).verified)}}</td>
        <td>${{corrS}}</td>
        <td><code>${{(r.source_post_url || '')}}</code></td>
      </tr>`;
    }}).join('');
    const pts = (data.distributions.points_by_round || []).map(r =>
      `<tr><td>${{r.round}}</td><td>${{r.extracted_items}}</td><td>${{r.points_1 ?? '—'}}</td>
       <td>${{r.points_2 ?? '—'}}</td><td>${{r.points_3 ?? '—'}}</td><td>${{r.points_sum ?? '—'}}</td>
       <td>${{yn(r.complete)}}</td></tr>`
    ).join('');
    const eraBlock = data.distributions.primary_era?.full_65_79 || {{}};
    const confirmedBlock = data.distributions.primary_era_confirmed?.full_65_79 || {{}};
    const shares = eraBlock.equal_weight?.share_of_included || null;
    const recent = data.distributions.primary_era?.recent?.equal_weight?.share_of_included || null;
    const confirmed = confirmedBlock.equal_weight?.share_of_included || null;
    const eraRows = shares
      ? Object.entries(shares).sort((a,b)=>b[1]-a[1]).map(([k,v]) =>
          `<tr><td>${{k}}</td><td>${{pct(v)}}</td><td>${{pct(recent && recent[k])}}</td><td>${{pct(confirmed && confirmed[k])}}</td></tr>`).join('')
      : '<tr><td colspan="4">분류 표본 없음 — 0으로 채우지 않음</td></tr>';
    const cov = data.coverage || {{}};
    const val = data.validation || {{}};
    document.getElementById('app').innerHTML = `
      <h2>현황</h2>
      <p>추출 ${{cov.extracted_items}} · 자동분류 ${{cov.auto_classified_items}} ·
         AI원본대조 ${{cov.ai_source_checked_items}} · 사람검수 ${{cov.human_reviewed_items}}</p>
      <p class="${{val.ok ? 'ok' : 'bad'}}">검증 ${{val.ok ? '통과' : '오류'}} (error ${{val.error_count}}, warning ${{val.warning_count}})</p>
      <h2>회차별 확보</h2>
      <table><thead><tr><th>회차</th><th>시행일</th><th>문제지</th><th>정답표</th><th>웹정답</th><th>표지</th><th>정정</th><th>출처 URL</th></tr></thead>
      <tbody>${{rounds}}</tbody></table>
      <h2>배점</h2>
      <table><thead><tr><th>회차</th><th>추출</th><th>1점</th><th>2점</th><th>3점</th><th>합</th><th>완결</th></tr></thead>
      <tbody>${{pts}}</tbody></table>
      <h2>시대 비중 (균등 vs 최근 회차 균등 vs 원본 대조)</h2>
      <p class="note">분모는 해당 필드가 분류된 문항 수. auto included=${{eraBlock.included_items}} / universe=${{eraBlock.universe_items}}; confirmed included=${{confirmedBlock.included_items || 0}}</p>
      <table><thead><tr><th>시대</th><th>전체 균등(자동+)</th><th>최근 회차 균등</th><th>원본 대조</th></tr></thead>
      <tbody>${{eraRows}}</tbody></table>
      <h2>근거 부족</h2>
      <ul>
        <li>정답률·변별도 추정 없음</li>
        <li>공식 문항별 평가유형 미공개</li>
        <li>사람 검수 0</li>
        <li>시각 자료 필수 여부는 원본 확인 문항만</li>
      </ul>
    `;
  </script>
</body>
</html>
"""


def write_reports(manifest, coverage, dist, validation, blueprint) -> None:
    md = render_markdown(manifest, coverage, dist, validation, blueprint)
    (RESEARCH_DIR / "report.md").write_text(md, encoding="utf-8")
    (RESEARCH_DIR / "report.html").write_text(render_html(manifest, coverage, dist, validation), encoding="utf-8")
