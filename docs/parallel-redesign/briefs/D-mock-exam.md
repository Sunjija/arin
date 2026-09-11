# 담당 D 지시문 — 실전 연습

이 채팅에서 **D만** 구현한다. 총괄 채팅의 단계 0 커밋(`cursor/redesign-foundation-1da6`)에서 분기한다.

필수 문서: `docs/parallel-redesign/contracts.md`, `ownership.md`.

## 소유 파일만 수정
`src/pages/MockExamPage.tsx`, `src/components/mock/**`(필요 시), `src/lib/examScoring.ts` 및 테스트.

금지: db, backup, scoreEstimate, studyService, types, 공통 CSS.

## 준비
“10문항 연습 · 16분” / “50문항 실전 연습 · 80분”. 진행 중 시험이 있으면 `getActiveMock()`으로 “이어서 풀기”를 먼저. 새로 시작은 기존 진행 설명+확인 후 `replaceExisting: true`. 합격 예측·안정권 문구 금지. 최근 기록은 `getScoreSummary().recentMocks`.

## 출제
full은 `inspectFullMockPool` 통과 전에는 시작 금지. `__pad`로 50을 채우지 말 것(`pickMockQuestions`의 패딩 루프 제거). 문항이 부족하면 10문항 연습 안내. 기존 1/2/3점 목표 비율은 로컬 규칙으로 유지하되 “공식 고정”이라고 단정하지 않음. 난이도 묶음 순서를 없애고, 시대 순서 + 같은 시대 내 섞기를 명시. 세션 내 선지 순서는 snapshot에 고정.

`startMock({ mode, snapshots, durationMs: SAMPLE_DURATION_MS | FULL_DURATION_MS })`로 저장부터 완료.

## 실행
`useFocusLayout(true)`(`src/components/layout/useFocusLayout.ts`)는 running만. 닫기 / N/50 / 남은 시간(`deadlineAt - Date.now`). 50개 번호는 “답안 현황”으로 접기. era 단서 메타 숨김. 배점은 가능. 마지막 문항의 다음은 답안 확인/제출. 미응답 개수와 번호 이동. setInterval은 표시용. stale closure 금지. 자동/수동 제출은 `finalizeMock`으로 한 결과 ID. 마감 초과 복귀 시 저장된 최신 답안 제출. `saveMockProgress` revision. 저장 오류 재시도. 문항별 시간은 실측, 없으면 null. 타이머를 매초 aria-live로 읽지 않음.

## 결과
점수, 맞힌 수, sample/full. 원문 지문·내 선택·정답·해설은 snapshot으로. `getScoreSummary` 사용. `[result.score, ...recent]` 중복 집계 금지. 오답 카드는 `createWrongCardFromQuestion`. 원인 미확인, 결과에서 `updateAttemptCause`. 다음 복습은 실제 틀린 문항.

## 필수 테스트
종료 직전 답안 반영, 중복 제출 1회, 새로고침 보존, 50 미만 복제 없음, sample이 full 평균에 안 들어감, 미응답 채점, 원문 복원, 저장 실패 재시도. fake timer 사용.

제출 형식은 총괄 00과 동일.
