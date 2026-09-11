# 한사코치 개발 지시 — 2026-09-11 개정

## 기준과 현재 상태
감사 기준: `codex/arin-design-v3`의 `34c0f104dfd41a2c422cc5c74d01df2e2b633819`.
이 SHA는 현황 확인 지점이며 영구 분기점이 아니다. 새 작업은 총괄이 검증한 최신 통합 SHA에서 시작한다. 이전 `cursor/redesign-foundation-1da6` 고정 분기 지시는 폐기한다.

기준 브랜치에는 단원 18, 자체 문항 100, 카드 95, 연표 사건 70이 있다. 선사·고조선 자료실 확인 문제 6개는 화면 내 결과만 제공한다. 오늘 학습은 여전히 카드 우선, 진도는 달력 기반, 복습은 같은 시대로 제한되어 있다. 이것은 유지 정책이 아니라 수정 대상이다. 이 수치는 미병합 PR과 공개 배포의 상태를 뜻하지 않는다.

## 읽기 순서와 작업 순서
`../../AGENTS.md` → [정책·계약](contracts.md) → [소유권](ownership.md) → 담당 brief.
1. 총괄이 기존 PR을 비교하고 재사용 코드·계약을 선택한다.
2. [E 공통 기반](briefs/E-learning-foundation.md): 데이터 구조·기록 통합·마이그레이션·서비스를 구현하고 API를 동결한다. ([동결 API](e-foundation-api.md))
3. B 목표·진도를 첫 Cursor 구현 묶음으로 검수한다.
4. E 계약과 B 검수를 통과한 뒤 독립 범위의 C/F를 병렬 배정할 수 있다.
5. G 콘텐츠 검수·기출 분석은 별도 산출물로 진행한다. D 실전은 검수된 데이터·계약 연결 후 진행한다.
6. 총괄이 통합 수용 검사를 수행한다. 배포는 별도 상태로 보고한다.

## 기존 열린 PR — 재구현 전에 확인
2026-09-11 조회 기준. 제목/설명·변경 경로를 확인했으며 전체 코드 품질 승인이나 병합 권고를 의미하지 않는다.

| PR | 작업 | 이번 방향과의 관계 |
|---|---|---|
| [#12](https://github.com/Sunjija/arin/pull/12) | 개인별 오늘 학습·복습 흐름 | 목표·개념 진도·세션 재개 구현 후보. 시간 우선 정책, 순서, 누적 복습을 최신 계약과 대조 |
| [#11](https://github.com/Sunjija/arin/pull/11) | 기출 패턴 분석 | 공식 분석 계약 후보. 회차 범위·누락·출처·수동 검수 여부 확인 |
| [#8](https://github.com/Sunjija/arin/pull/8) | 모의고사 품질 | 문항 관리·자료 렌더링·배점 관련 구현 후보. 공통 파일 중복 변경 주의 |
| [#1](https://github.com/Sunjija/arin/pull/1), [#2](https://github.com/Sunjija/arin/pull/2), [#6](https://github.com/Sunjija/arin/pull/6) | 이전 기반·화면·오답 수정 | 필요한 수정 보존. 과거 제품 정책은 최신 계약으로 대체 |
| [#7](https://github.com/Sunjija/arin/pull/7), [#9](https://github.com/Sunjija/arin/pull/9), [#10](https://github.com/Sunjija/arin/pull/10) | 동기화·모바일·결제 | 별도 범위. 이번 학습 개편에 자동 포함하거나 삭제하지 않음 |

## 배정 문서
- [B 목표·오늘·진도·설정](briefs/B-home-progress-settings.md)
- [C 학습·누적 복습](briefs/C-study-review.md)
- [D 실전 평가](briefs/D-mock-exam.md)
- [E 공통 학습 기반](briefs/E-learning-foundation.md) · [동결 API](e-foundation-api.md)
- [F 자료실·개념 학습](briefs/F-library-timeline.md)
- [G 콘텐츠·문항·이미지](briefs/G-content-quality.md)

## 통합 수용 기준
- 신규 사용자는 개념부터 학습한다. 결석·목표일 변경에도 미완료 진도를 보존한다.
- 새 문제는 현재 개념/단원, 복습은 배운 범위 전체. 배운 적 없는 카드는 자동 복습에 넣지 않는다.
- 자료실 오답이 동일한 학습 이력과 복습 대상에 반영된다. 같은 제출을 두 번 저장하지 않는다.
- 기존 세션·사용자 편집 카드·백업을 보존한다. 미래 목표일 누락/과거 날짜/남은 분량 과다를 처리한다.
- 미노출 문항 평가와 반복 정답을 구분한다. 배점은 실측 난이도가 아니다.
- 관련 테스트·타입·lint·빌드 결과와 미해결 사항을 남긴다. UI 검증은 실행한 범위를 명시한다.
