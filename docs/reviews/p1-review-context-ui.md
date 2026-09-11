# P1-03 · 문제 선정 이유·반복/첫 풀이 기록 UI

기준 SHA: `afe60756ddb64fda1ee3613dce9915af4763ee47`  
작업 브랜치: `cursor/p1-review-context`  
확인일: 2026-09-11  
담당: Cursor (허용 파일만)

허용 변경: `src/components/study/QuizStep.tsx`, `src/components/study/ResultStep.tsx`, `src/components/study/QuizStep.test.tsx`, `src/components/study/ResultStep.test.tsx`, 본 보고서.

## 1. 변경 요지

`review-context-api.md`의 순수 표시 함수만 소비한다. 별도 저장소·타입·DB·서비스·CSS를 만들지 않았다.

| 화면 | 소비 API |
|---|---|
| QuizStep | `questionContextCopy(session.questionContexts?.find(...))` |
| ResultStep | `sessionExposureStats(session)` |

- QuizStep: 정답 공개 전·제출 후 해설에 `reasonLabel` · `historyLabel` · `reasonDetail`을 동일하게 표시. `historyDetail`은 `풀이 이력 기준` details로 접는다. 배점 pill 유지. 개발 ID·영문 reason·배열 미노출.
- ResultStep: daily/review 모두 첫 풀이·다시 풀이·구분 정보 없음의 `correct/total` 표시. `total=0`은 `기록 없음`(0% 미생성). 첫 풀이는 ‘학습 시작 전 동일 문항 답안 없음’ 문구. 카드 수·합산 정답률·이동 링크 유지.
- 구형 세션(`questionContexts` 없음)은 표시 함수의 미확인 문구. UI에서 DB로 첫 풀이를 추정하거나 context를 수정하지 않음.
- 선택·제출·원인 건너뛰기·같은 attempt 갱신·저장 실패·다음 흐름 보존. 기존 Pretendard/클래스만 사용.

## 2. 수용 기준별 증거

| 기준 | 증거 |
|---|---|
| due / recent / supplementary 표시 | `shows due, recent-wrong, and supplementary…` — 복습 예정일 도래·최근 오답 다시 확인·배운 범위 확인, `due-review` 문자열 없음, 배점 유지 |
| 첫 풀이 / 반복 / 유사 계열 / 구형 미확인 | `shows first, repeated, similar-family…` — 각 historyLabel·펼친 historyDetail·이어 풀던 문제/이전 풀이 횟수 미확인 |
| 제출 전 해설 숨김·제출 후 이유 유지 | `hides the explanation until submit…` — 제출 전 explanation null, 제출 후 동일 reason/history, attempts=1 |
| 문항 변경·remount | `updates context when the question changes…` — 다음 문항 recent 라벨, remount 후 동일 |
| 선택·원인 건너뛰기·같은 attempt·저장 실패·다음 | `keeps selection, cause skip…` — disk full 시 해설 비공개·attempts=0, 재시도 후 1건, cause 갱신 동일 attemptId, 다음 문항 |
| 결과 그룹·중복 방어·0분모·링크 | ResultStep 3개 — sessionExposureStats 중복 제거, 빈 그룹 `기록 없음`, daily/review 링크 유지 |

표시 테스트는 fixture, 저장 흐름은 `fake-indexeddb` + 실제 `recordQuizAnswer`/`updateAttemptCause`. UI 전체를 mock으로 대체하지 않음.

## 3. 검증 명령·결과

Node: `/Users/daddung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`  
`node_modules`: 이 worktree 내부에서 `../arin-design-v3/node_modules` 심볼릭 링크(설치·lockfile 변경 없음).

1. `node node_modules/vitest/vitest.mjs run src/components/study/QuizStep.test.tsx src/components/study/ResultStep.test.tsx` → **8 passed**
2. `node node_modules/typescript/bin/tsc -b --pretty false` → **exit 0**
3. `node node_modules/oxlint/bin/oxlint src/components/study` → **exit 0**

미실행: 전체 회귀, 실제 브라우저 QA(320px·모바일·키보드·긴 글 전수), 공개 배포. 실사용 브라우저 DB 초기화·테스트 답안 입력 없음.

## 4. 계약·의존성·미해결

- 공통 타입/DB/API/CSS/콘텐츠/lockfile 미변경. `questionStudyContext`·세션 필드 계약은 총괄 기준 `afe6075`에 이미 있음.
- 백업 검증·전체 회귀는 총괄이 다른 worktree에서 진행 중(본 작업 범위 밖).
- push / PR / 배포 / 외부 메시지 / 전역 설정 / 추가 에이전트 없음.
- 범위 밖 의존: 없음(허용 UI·테스트·보고서만).
