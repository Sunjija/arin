# P1-03 문제별 선정 이유와 풀이 이력 소비 API

2026-09-11. 소유: E/총괄. 실제 구현은 `src/lib/questionStudyContext.ts`, 저장 타입은 `src/types/index.ts`다. DB/백업 v4에 선택적 필드를 추가하며 기존 세션을 삭제하거나 과거 이유를 추정하지 않는다.

## 저장과 선정

`FrozenStudyPlan.questionContexts?`, `ActiveSession.questionContexts?`는 `QuestionStudyContext[]`다. questionId로 연결한다. 순서를 임의 재정렬하거나 별도 UI 저장소를 만들지 않는다.

- reason: `new-concept` 오늘 개념 확인, `lesson-practice` 직접 선택 단원 확인, `due-review` 예정일이 도래한 카드 연결, `recent-wrong` 최근 7개 달력일 내 마지막 답안이 오답, `review-practice` 그 외 배운 범위 확인.
- selectedOn: 선정 날짜. dueOn은 도래일, lastWrongAt은 최근 오답 시각이며 해당 이유 외에는 null이다.
- priorAttemptCount: 같은 questionId의 기존 답안 수. similarQuestionAttemptCount는 다른 ID 중 명시적 familyId가 같은 기존 답안 수이며 계열 미지정이면 null이다. 화면 열람 기록이나 외부에서 본 자료까지 측정하지 않는다.
- 계획은 선정 때, 세션은 시작 때 답안 이력을 읽는다. 세션 시작 후 답안 제출·날짜 변경에도 이 값을 고정한다. 구형 세션은 필드가 없으며 현재 DB로 역산해 채우지 않는다.
- 도래 60%/최근 오답 40%는 휴리스틱 우선 배정이다. 빈자리는 남은 도래 → 남은 최근 오답 → 배운 범위 확인 순서다. 문항에는 실제 배정한 이유를 기록한다. 도래 후보는 카드 일일 상한을 적용하기 전 전체 학습된 도래 카드에서 찾는다.
- 오늘 선택한 새 문항과 복습 문항은 중복하지 않는다. 새 문제 범위와 기존의 학습 이력 제한은 유지한다. 최근 오답 뒤 정답이 있으면 최근 오답 우선 대상에서 제외한다. 과거 오답 기록 자체는 삭제하지 않는다.

## C가 사용할 순수 표시 함수

```ts
import { questionContextCopy, sessionExposureStats } from '../../lib/questionStudyContext'
const context = session.questionContexts?.find(item => item.questionId === questionId)
const { reasonLabel, reasonDetail, historyLabel, historyDetail } = questionContextCopy(context)
const { first, repeated, unknown } = sessionExposureStats(session)
// 각 결과: { total, correct }. total=0이면 정답률을 만들지 않는다.
```

표시 함수는 DB를 읽거나 쓰지 않는다. `questionContextCopy(undefined)`는 구형 세션에 대해 '이어 풀던 문제 / 이전 풀이 횟수 미확인'을 반환한다. `sessionExposureStats`는 제출한 답안만 첫 풀이/다시 풀이/구분 정보 없음으로 나누며 중복 questionId를 세지 않는다. first는 동일 문항의 저장된 답안이 없었다는 뜻이다. 계열이나 외부 노출을 포함한 '처음 보는 문제', '미노출 실전 점수', '숙달'로 바꾸지 않는다.

QuizStep은 문제·피드백 양쪽에 reasonLabel/historyLabel과 짧은 reasonDetail을 노출하고, 긴 historyDetail은 펼쳐 읽을 수 있게 한다. 선택·저장·원인·다음 흐름을 바꾸지 않는다. ResultStep은 첫 풀이/다시 풀이/구분 정보 없음의 정답 개수와 제출 개수를 보여준다. 복습 세션에서도 같은 결과를 표시한다.

`selectReview`의 questionItems는 계획의 복습 문항 context 전체다. recentWrongItems는 실제 recent-wrong 선정만 포함하며 dueOn은 null이다. 구형 계획에 이유가 없으면 상세 목록도 비워 두고 questionIds는 보존한다.
