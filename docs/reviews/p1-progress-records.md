# P1-05 학습 기록 화면 제출 검토

2026-09-13. 기준 SHA: `fad1c5c0743307c138db9e2e22bf289fa361ab4c`. 브랜치: `codex/release-progress-evidence`. 이 보고서를 추가한 커밋이 제출 커밋이며 최종 인수 메시지에 전체 SHA를 전달한다. 이번 구현은 이전 Cursor B 제출을 인수했다는 주장이 아니다. 해당 제출을 현재 호스트의 git refs에서 확보하지 못한 상태에서 총괄이 최신 기준으로 같은 5파일 범위를 재배정했다.

## 변경과 계약

- `src/pages/ProgressPage.tsx`: 현재 목록의 완료/남은 개념, 남은 설명의 준비/미준비 개수, 개념 목표일과 시험일, 기존 스케줄 경고를 표시한다. 열람·학습 중·구형 단원 완료를 개념 완료로 추정하지 않는다.
- `src/lib/progressSummary.ts`: `buildConceptSchedule`과 `sessionExposureStats`를 소비하는 화면 전용 순수 집계다. `activeSession.step === result`인 경우에만 저장 당시의 첫 풀이/다시 풀이/구분 정보 없음과 마지막 저장 날짜를 표시한다. 카드만 완료한 학습은 제출 문제 없음으로 표시한다.
- `src/pages/ProgressPage.test.tsx`, `src/lib/progressSummary.test.ts`: 새 10개 검증을 추가한다.
- 이 보고서까지 허용 5파일만 변경한다.

`getProgressSnapshot`, `getGoal`, `catalogConcepts`, `db.attempts.toArray`, `db.conceptProgress.toArray`, `db.activeSession.toCollection().first`만 조회에 사용한다. 계획 생성·세션 시작/완료·저장·seed 함수는 호출하지 않는다. 공통 타입·DB·학습 API·CSS·의존성·잠금파일·백업/마이그레이션 변경이 없다. 조회 실패 시 내부 예외를 노출하지 않고 읽기 재시도를 제공한다. effect 정리로 폐기된 요청의 성공/실패를 무시한다.

기존 PR #2/#12 재사용 결정은 [통합 검토](../pr-integration-review.md)를 따른다. 기존 ProgressPage의 연습 추이·실전 집계·자료실/실전 링크와 디자인을 유지하며 별도 DailyLearningService/StorageAdapter는 추가하지 않았다. 약점의 단위는 시대·문항 유형으로 바로잡고 적은 기록이나 반복 정답을 숙달로 해석하지 않도록 설명한다. 기존 집계의 최소 표본 정책은 수정하지 않았다.

## 수용 기준별 증거

| 기준 | 실행 결과 |
|---|---|
| 빈 기록, 목록 밖 ID, 열람/학습 중/완료, 구형 단원 완료 | 순수 집계와 실제 fake-indexeddb 화면 테스트에서 완료한 목록 개념만 합산. 0/88 및 1/88 확인 |
| 시험일 미정/과거, 쉬는 날, 미준비 설명 | 미정 화면 표시, 기존 계산의 과거 시험/목표·쉬는 날·81개 미준비 경고 보존 확인. 준비된 설명을 전체 과정으로 표시하지 않음 |
| 완료 세션 첫/반복/미확인, 중복 답안 | 기존 `sessionExposureStats`를 사용하여 동일 문항 중복 제거. 실제 저장된 완료 세션의 세 그룹 정답·문항 수 확인 |
| 미완료·카드만 완료·구형 context 없음 | 진행 중에서는 결과 미표시, 카드만 완료는 제출 문제 없음, 구형은 전부 구분 정보 없음. 기존 attempts가 있어도 소급 분류하지 않음 |
| 기간 적용 범위 | 키보드 Enter로 30일 전환 후 연습 표본은 1→2문항으로 변하고 저장된 완료 세션 영역은 동일함을 확인 |
| 조회 실패/재시도 | 실제 DB의 conceptProgress 읽기만 한 번 실패 주입. 내부 오류 미노출, 재시도 후 실제 읽기 성공 |
| 늦은 응답·unmount | StrictMode의 폐기된 첫 effect가 늦게 반환해도 최신 목표일 유지. unmount 후 늦은 실패도 화면을 갱신하지 않음 |
| 조회의 DB 불변 | 모든 테이블의 행을 전후 비교. 빈 기록 조회, 실제 기록 조회/기간 전환, 실패/재시도 모두 동일 |
| 기존 링크/기록 | 실전 시작 및 시대별 자료실 링크 유지, 기존 연습 추이/실전 점수 코드 보존 |

## 실행 검증

Node 24.19.0. 총괄이 허용한 의존성 디렉터리에 이 worktree의 node_modules junction을 연결했다. 의존성 및 잠금파일은 수정하지 않았다.

- `node node_modules/vitest/vitest.mjs run`: **51파일, 249개 통과**. 기준 49파일/239개에서 새 2파일/10개 추가.
- `node node_modules/typescript/bin/tsc -b --pretty false`: 통과.
- `node node_modules/oxlint/bin/oxlint src/pages/ProgressPage.tsx src/pages/ProgressPage.test.tsx src/lib/progressSummary.ts src/lib/progressSummary.test.ts`: 통과.
- `node node_modules/vite/bin/vite.js build`: 통과. 번들 500 kB 초과 경고는 남아 있으며 코드 분할은 이번 소유 범위 밖이다.
- impeccable 화면 정적 탐지: 해당 화면의 결과 `[]`. 실제 화면/접근성 전체 검수를 대신하지 않는다.
- 시작 시 clean worktree, 지정 브랜치/기준 SHA 확인. `git ls-remote origin HEAD`는 `6680c1f127dc4469965e7295e284004c6566c193`. `gh pr list`는 gh가 PATH에 없어 실행 실패했으므로 최신 열린 PR 목록은 총괄 검수로 남긴다.

## 남은 제한과 인수 범위

현재 저장된 세션 1회만 표현한다. 새 세션이 기존 슬롯을 대체하면 이전 회차의 분류 정보는 여기서 복원하지 않는다. `updatedAt`는 마지막 저장 날짜이며 전체 학습 역사나 정확한 실학습 시간으로 해석하지 않는다. 페이지 열린 뒤 다른 창에서 바뀐 기록의 실시간 구독은 추가하지 않았다.

실제 브라우저 320/375/768px·데스크톱·200% 확대·긴 글·화면 낭독기 검증은 미실행이며 총괄 통합 QA가 필요하다. 기존 CSS와 줄바꿈 가능한 단일 열, 기간 버튼의 flex-wrap, 의미 있는 section/dl/버튼을 사용했고 키보드 기간 전환은 jsdom에서 검증했다. 이 테스트는 사용자 브라우저 DB에 답안을 넣거나 초기화하지 않는다.

전 범위 콘텐츠, 전문가 검수, 학습 효과·미노출 실전 평가, 배포 접근 복구는 이번 구현의 완료 범위가 아니다. 서비스 전체 80% 달성이나 출시 준비 완료를 주장하지 않는다. push·PR·병합·배포는 하지 않았다.
