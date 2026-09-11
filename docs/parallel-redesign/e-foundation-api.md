# E · 현재 구현된 공통 API와 남은 게이트

2026-09-11, `learning-foundation-v1.1`, DB/백업 v3. PR #14를 수정 통합한 현재 소스 기준. **기록 API는 소비 가능하며 계획 엔진 전체 동결을 선언하지 않는다.** 미완성 항목은 아래에 명시한다. 소유자는 E/총괄이다.

## 호출 계약

`src/lib/learningApi.ts`, 입출력 타입 `src/types/learning.ts`, 저장 타입 `src/types/index.ts`.

| export | 입력 → 반환 | 저장/에러 계약 |
|---|---|---|
| `getSettings`, `getGoal` | 없음 → 정규화된 설정/목표 Promise | 설정이 없으면 DataError `not-found` |
| `saveGoal` | `SaveGoalInput` → `LearningResult<LearningGoal>` | 성공 `ok/value`, 실패 `validation-failed` 또는 `save-failed`. 설정/계획 무효화 한 트랜잭션 |
| `computeStudyPlan` | `today?: YYYY-MM-DD` → `FrozenStudyPlan` | 잘못된 날짜 `validation-failed`, DB 실패 reject. 기존 미완료 세션의 목록 우선, 없는 경우 당일 계획 저장 |
| `startLesson` | `{today?, entryMode?: daily/review, lessonId?}` → `ActiveSession` | 날짜가 달라도 미완료 세션 우선. 새 세션은 UUID·문항 스냅샷 보관. 잘못된 단원 `not-found`; DB 실패 reject |
| `recordAnswer` | 문항/선택/출처/선택적 시간/attemptId/resultId/snapshot → `AttemptRecord` | 답안·오답·숙련도·개념 기록을 원자적으로 저장. 동일 attemptId 또는 resultId+문항 재시도는 원본 반환. 다른 문항에 같은 ID 재사용은 거절 |
| `recordConceptView` | `{conceptId, at?: YYYY-MM-DD}` → `ConceptProgressRecord` | 열람 시각만 기록. 완료/숙련도 상승 아님. 알 수 없는 ID/날짜 거절 |
| `selectReview` | 날짜 → `ReviewSelection` | 계획의 도래 카드/복습 문항. recentWrongItems는 실제 오답 이력과 교집합 |
| `completeSession` | `ActiveSession` → `{session, created}` | 완료 ID 멱등성. 일일 합산·단원/개념 완료·메타·세션 원자 저장. 설명+새 확인 문항 답안이 있어야 단원 완료 |

`recordAnswer.correct`는 기존 호출 호환용이며 채점에 신뢰하지 않는다. 정오와 오답 원본은 스냅샷으로 계산한다. `responseMs: null`은 미측정이며 가짜 시간을 채우지 않는다. 일반 학습은 긴 응답 시간으로 감점하지 않는다. 벽시계상 세션 경과 시간은 중단 시간을 포함하므로 실제 학습 시간으로 기록하지 않는다.

```ts
import { recordAnswer, saveGoal } from '../../lib/learningApi'

const goal = await saveGoal({ examDate: '2026-12-01', examDateUndecided: false })
if (!goal.ok) showSaveError(goal.message)

// attemptId는 화면의 같은 제출/저장 재시도 동안 고정한다.
try {
  const saved = await recordAnswer({
    question, selectedIndex, correct: false, responseMs: null,
    learningSource: 'library', attemptId,
  })
  showFeedback(saved.correct, saved.selectedIndex)
} catch {
  showSaveError('답안을 저장하지 못했습니다. 같은 답안을 다시 저장해 주세요.')
}
```

예제 날짜는 형식 예시이며 공식 시험 일정이 아니다. 화면은 저장 성공 후 피드백/단계를 바꾼다. `studyService`의 `startOrResumeSession`/`recordQuizAnswer`/`finishSession`은 호환 어댑터로 유지한다. QuizStep, 자료실 LessonPractice, 모의 최종 제출이 공통 답안 기록을 사용한다. 모의 제출은 전체 결과와 답안 기록을 함께 rollback한다.

## 모델 선택과 이전

| 후보/기존 구조 | 현재 선택 |
|---|---|
| #12 별도 DailyLearningService/StorageAdapter | 별도 저장소를 추가하지 않고 `learningApi` + 기존 Dexie 사용 |
| TopicEntry.notes | 콘텐츠 제작 메모. 실제 설명으로 노출하거나 학습 완료 근거로 쓰지 않음 |
| #14 키워드/첫 개념 fallback | 제거. 문항에 명시된 conceptIds만 연결. 6개 외 기존 문항은 미매핑 유지 |
| 개념 완료와 숙련 | learnState와 nullable reviewMastery 분리. 반복 정답률을 개념 숙련도로 임의 환산하지 않음 |
| 기존 difficulty | 1~3점 배점 유지. stats는 선택적 실측 필드이며 현 데이터는 미측정 |
| #8/#11 출처/자료/검수 필드 | 아직 전체 도입 전. 기존 sourceUrl + 선택적 conceptIds/familyId/contentVersion, 향후 버전 명시 이전 |

DB v3는 `conceptProgress` 테이블을 추가한다. 기존 ID·카드·시도·완료·세션·모의 원본은 삭제하지 않는다. 콘텐츠 seed 갱신도 진행 중 세션을 지우지 않는다. 새 세션은 snapshot이 있으며 구형 세션은 기존 질문 ID fallback을 유지한다. 구형 문항 내용이 바뀌기 전 원본을 소급 복원할 수 있다고 주장하지 않는다.

백업 v3는 conceptProgress를 포함하고 v1/v2를 계속 읽는다. 복원 검증을 먼저 실행하고 전체 복원을 하나의 트랜잭션으로 수행한다. 기록에 없는 개념 완료·숙련도를 추정하지 않는다. 구형 단원 완료는 단원 이력으로 보존하며 개념 상세 진도는 보수적으로 학습 중 상태까지만 이전한다.

## 아직 남은 P0-03 / P1 경계

1. **세부 분량:** 현재 한 세션에 한 단원. `dailyNewConceptCount`는 저장 가능한 선호값이나 부분 개념 세션에 아직 적용하지 않는다. B가 이 값을 조절하면 즉시 N개 개념 분량이 만들어진다고 표시하면 안 된다. 현재 완주일은 1단원/선택 학습일 가정의 투영이다.
2. **과정 순서:** 기존 week/dayOrder를 유지한다. 여러 나라 추가와 lesson-12~18의 시간순 재배열은 콘텐츠 지도와 안정 ID 이전 기준으로 확정해야 한다.
3. **복습:** 완료 단원 기준 + 명시적 카드 범위가 현재 안전망이다. 자료실의 부분 개념 학습·오답을 전체 단원 완료 전에도 정확히 복습시키는 개념 단위 조건은 후속 작업이다. `selectReview.questionIds`는 전체 복습 문항이며 `recentWrongItems`는 실제 오답 중 도래 카드와 겹치지 않는 항목이다. 문항별 도래/오답/보충 이유를 화면에 전달하는 확장 계약은 후속 작업이다.
4. **스냅샷:** 새 진행 세션의 문제 원본은 보존한다. 개념 설명 버전의 세션 내 고정과 계획/세션 전체의 revision 충돌 정책은 보완해야 한다.
5. **콘텐츠:** 7개 상세 설명 외 단원은 기존 요약/체크포인트다. 미준비 경고는 계획에 포함되지만 목표 화면·시작 버튼까지 준비 상태를 적용하는 것은 P1 작업이다. 승인된 문항만 출제하는 최종 품질 게이트는 P2-03이다.
6. **자료실:** 답안 이력은 저장되지만 자료실 확인 흐름의 현재 화면 단계·점수는 새로고침 후 이어지지 않는다. 후속 F 작업에서 재개를 연결한다. 단순 열람/자료실 문제만으로 단원 전체를 완료하지 않는다.
7. **기존 설정 UI:** 목표 날짜·요일 등의 전체 입력 화면과 낡은 시간 필드 제거는 B 작업이다. API 필드가 존재한다고 화면 구현 완료로 표기하지 않는다.

위 항목을 해결해 수용 기준을 검증한 뒤 API 전체 동결과 B/C/F 작업 배정을 결정한다. 이번 문서 작성은 에이전트나 Cursor 작업 실행이 아니다.
