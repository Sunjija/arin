# 담당 C 지시문 — 집중 학습 · 복습

이 채팅에서 **C만** 구현한다. 총괄 채팅의 단계 0 커밋(`cursor/redesign-foundation-1da6`)에서 분기한다.

필수 문서: `docs/parallel-redesign/contracts.md`, `ownership.md`.

## 소유 파일만 수정
`src/pages/StudySessionPage.tsx`, `CardsPage.tsx`, `src/components/SessionProgress.tsx`, `src/components/study/**`(필요 시), `src/lib/cardQuiz.ts` 및 테스트.

금지: 공통 CSS, types, db, studyService 본문, 콘텐츠 원본, App.tsx.

## 집중 학습
- 실행 중 `useFocusLayout(true)` (`src/components/layout/useFocusLayout.ts`). 결과/나가기면 false. 상단: 닫기 / `카드 1/10` 같은 짧은 진행. 4단계 박스 2행 금지.
- 닫기: `saveSession` 후 `/`. 저장 실패 시 알리고 유지.
- 순서: 카드→개념→문제→결과. session id 이어하기 유지. `entryMode=review`면 카드 후 복습으로.
- 지문 `.passage-text`, 선지 `ChoiceOption`. desktop `.focus-reading`.
- 문제 era 메타는 채점 후에만. 카드 주제 레이블은 유지 가능.

## 선택·채점
`ChoiceOption` state: unselected / selected / correct / incorrect / locked. 채점 후 opacity 1. 카드는 즉시 채점, 문제는 선택 후 제출. 중복 클릭으로 attempt가 두 번 생기지 않게 `attemptId`와 진행 잠금.

오답 원인: 정답·해설을 읽은 뒤. 제출 시점 `responseMs` 고정. 원인 선택 시간은 풀이 시간에 더하지 않음. 먼저 `cause: 'unknown'`으로 `recordQuizAnswer`, 이후 `updateAttemptCause`. 건너뛰기 가능. 자동 이동 금지.

## 오답 카드
`createWrongCardFromQuestion`만 사용. Study/Cards/Mock에서 front를 직접 조합하지 않음. `source-missing`이면 편집 안내. `cardQuiz` 오답 후보는 같은 kind·시대 우선. 후보 부족 시 회상/정답 확인. placeholder 선지 금지.

## 복습 목록
탭: 오늘 복습 / 전체 카드 / 오답 기록. 왕·업적 등 필터는 보조. 오늘 복습이 목록인지 학습 시작인지 명확히. 복습 시작은 `startOrResumeSession({ entryMode: 'review' })`. 수정은 Dialog 또는 inline. 삭제 확인 유지. `updateCardContent`로 fingerprint 갱신.

## 검증
390×844 선지 가독성, 색 없이도 정답/오답, 새로고침·저장 실패·재진입, 원인 건너뛰기 후 같은 attempt 갱신, 카드 맥락 회귀 테스트.

제출 형식은 총괄 00과 동일.
