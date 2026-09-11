# E · 현재 구현된 공통 API와 남은 게이트

2026-09-11, `learning-foundation-v3`, DB/백업 v4 (자료실 재개 테이블 및 선택적 문제 선정·풀이 이력 필드). PR #14를 수정 통합한 현재 소스 기준. **기록 API는 소비 가능하며 계획 엔진 전체 동결을 선언하지 않는다.** 미완성 항목은 아래에 명시한다. 소유자는 E/총괄이다.

## 호출 계약

`src/lib/learningApi.ts`, 입출력 타입 `src/types/learning.ts`, 저장 타입 `src/types/index.ts`.

| export | 입력 → 반환 | 저장/에러 계약 |
|---|---|---|
| `getSettings`, `getGoal` | 없음 → 정규화된 설정/목표 Promise | 설정이 없으면 DataError `not-found` |
| `saveGoal` | `SaveGoalInput` → `LearningResult<LearningGoal>` | 성공 `ok/value`, 실패 `validation-failed` 또는 `save-failed`. 설정/계획 무효화 한 트랜잭션 |
| `computeStudyPlan` | `today?: YYYY-MM-DD` → `FrozenStudyPlan` | 잘못된 날짜 `validation-failed`, DB 실패 reject. 기존 미완료 세션의 목록 우선, 없는 경우 당일 계획 저장 |
| `startLesson` | `{today?, entryMode?: daily/review, lessonId?, startNewReview?}` → `ActiveSession` | 날짜가 달라도 미완료 세션 우선. 완료 review는 기본 호출에서 결과 유지, 명시적 목록 시작만 startNewReview=true. 새 세션은 UUID·문항 스냅샷 보관. 잘못된 단원 `not-found`; DB 실패 reject |
| `recordAnswer` | 문항/선택/출처/선택적 시간/attemptId/resultId/snapshot → `AttemptRecord` | 답안·오답·숙련도·개념 기록을 원자적으로 저장. 동일 attemptId 또는 resultId+문항 재시도는 원본 반환. 다른 문항에 같은 ID 재사용은 거절 |
| `recordConceptView` | `{conceptId, at?: YYYY-MM-DD}` → `ConceptProgressRecord` | 열람 시각만 기록. 완료/숙련도 상승 아님. 알 수 없는 ID/날짜 거절 |
| `selectReview` | 날짜 → `ReviewSelection` | 계획의 도래 카드/복습 문항. questionItems는 문항별 선정 근거이며 recentWrongItems는 실제 최근 오답 선정만 포함. 도래일 없는 오답에 오늘 날짜를 만들지 않음 |
| `completeSession` | `ActiveSession` → `{session, created}` | 완료 ID 멱등성. 일일 합산·단원/개념 완료·메타·세션 원자 저장. 새 세션은 선택 개념의 회상 확인+배정된 확인 문항 제출로 해당 개념 완료. 구형 단원 모드는 기존 완료 조건 유지 |

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
| #14 키워드/첫 개념 fallback | 제거. 문항에 명시된 conceptIds만 연결. 8개 외 기존 문항은 미매핑 유지 |
| 개념 완료와 숙련 | learnState와 nullable reviewMastery 분리. 반복 정답률을 개념 숙련도로 임의 환산하지 않음 |
| 기존 difficulty | 1~3점 배점 유지. stats는 선택적 실측 필드이며 현 데이터는 미측정 |
| #8/#11 출처/자료/검수 필드 | 아직 전체 도입 전. 기존 sourceUrl + 선택적 conceptIds/familyId/contentVersion, 향후 버전 명시 이전 |

DB v3는 `conceptProgress` 테이블을 추가한다. 기존 ID·카드·시도·완료·세션·모의 원본은 삭제하지 않는다. 콘텐츠 seed 갱신도 진행 중 세션을 지우지 않는다. 새 세션은 snapshot이 있으며 구형 세션은 기존 질문 ID fallback을 유지한다. 구형 문항 내용이 바뀌기 전 원본을 소급 복원할 수 있다고 주장하지 않는다.

백업 v4는 conceptProgress와 libraryPractice를 포함하고 v1/v2/v3을 계속 읽는다. 복원 검증을 먼저 실행하고 전체 복원을 하나의 트랜잭션으로 수행한다. 기록에 없는 개념 완료·숙련도를 추정하지 않는다. 구형 단원 완료는 단원 이력으로 보존하며 개념 상세 진도는 보수적으로 학습 중 상태까지만 이전한다.

## 목표·분량·부분 개념 세션 계약 (v2)

- `SaveGoalInput`/목표에 `conceptTargetDate: YYYY-MM-DD | null`, `paceMode: auto | manual`, `dailyNewConceptCount: 1..20`, 기존 날짜·요일·문제/카드 상한을 사용한다. SettingsPage도 `saveGoal`을 사용한다. 일일 시간 입력은 제거했고 구형 저장값은 백업 호환용으로 보존한다.
- 목표일을 지정하면 우선 사용한다. 비우면 시험 14일 전 복습 시작일의 전날, 시험도 미정이면 기존 startDate+planWeeks의 마지막 날이다. 공식 시험 일정은 수동 확인·입력이며 자동 최신 일정 연동으로 표시하지 않는다.
- `conceptSchedule.ts`: 남은 개념 / 남은 실제 학습일을 올림해 권장량 산출. 자동 모드는 1~20개, 직접 모드는 설정량. 지나간 목표·과도한 분량·쉬는 날·미래 시작일을 별도로 표시한다. 하루 문제/카드 입력값은 채워야 하는 최소량이 아니다.
- `src/data/courseOrder.ts`가 명시적 편집 순서다. 88개 내부 ID를 한 번씩 포함하고 시대 중간에 해당 문화사를 연결한다. 기존 ID·lessonId·week/dayOrder를 삭제하거나 재번호 매기지 않았다. 전 범위 설명이나 공식 범위 충족을 의미하지 않는다.
- 새 개념은 미완료 순서 중 설명과 출처가 있는 연속 구간만 배정한다. 첫 미준비 개념을 건너뛰지 않는다. 현재 준비된 7개 뒤 t-pre-06에서 멈춘다. `conceptFinishDate`는 미준비 내용이 있으면 null이다. 예정된 콘텐츠를 준비된 분량으로 합산하지 않는다.
- `FrozenStudyPlan.conceptSchedule`: 총량·완료량·미준비량·목표일·권장/적용 분량·오늘 ID·차단 지점·주의 사항. 홈의 실제 완료 개수만 조회 시 최신 기록으로 갱신하며 배정 목록은 고정한다.
- 새 기본 daily 세션은 `conceptIds`, `confirmedConceptIds`, `guideSnapshots`를 저장한다. 개념·질문 원본을 복사해 고정하고 자정·목표 변경·콘텐츠 수정에도 이어하기를 우선한다. 옵션 필드가 없는 구형 세션은 단원 모드로 재개한다. 명시적 `startLesson({lessonId})`는 기존 단원 연습 호환 경로다.
- 새 문항은 오늘 개념과 교집합이 있으며 모든 conceptIds가 오늘 범위 또는 완료 범위 안에 있어야 한다. 개념을 모르는 문항으로 수량을 채우지 않는다. 관련 객관식 문항이 없는 날에는 회상 확인을 기록할 수 있지만 정답률이나 숙련도를 만들어 넣지 않는다.
- 개념 완료는 회상 확인 체크와 배정된 새 문제 제출을 요구한다. 선택 개념만 완료하고, 해당 단원의 설명 원본 전체가 끝났을 때 단원 이력을 갱신한다. 정답 보장·회상 채점·숙련도 검증은 아니다. 당일 완료 후 학습 주소를 다시 열어도 같은 분량을 다시 만들지 않는다.
- 복습 문항은 개념 완료 또는 **그 문항을 실제 풀어 본 이력**을 사용한다. 자료실 한 문제를 풀었다고 같은 단원의 모든 문제를 열지 않는다. 카드의 legacy 완료 단원 범위는 호환 안전망으로 유지한다.
- 백업 v3에 새 옵션 필드를 포함한다. 목표/분량/개념 원본·선택 ID 일치를 검사하고 손상 시 기존 DB를 바꾸지 않는다. 이 부분 개념 기능은 v3에서 도입했고, 자료실 진행 테이블 추가로 현재 DB/백업은 v4다. 문항은 번들에서 읽으므로 카드 seed CONTENT_VERSION을 불필요하게 올리지 않았다.

## 아직 남은 P0-03 / P1 경계

1. 자료실의 문제/선택/해설/결과 재개 계약은 [자료실 진행 API](library-practice-api.md)에 분리했다. 읽기 스크롤 위치·검색 단원 복원 범위 확장과 모바일 전 과정 QA는 별도다. 단순 열람을 완료로 바꾸지 않는다.
2. 문항별 도래/최근 오답/배운 범위 확인 이유와 동일 문항의 이전 답안 수를 [복습 표시 API](review-context-api.md)로 제공한다. 마지막 답안이 정답이면 최근 오답 우선 대상에서 제외한다. 개인별 실측 가중치·회상 유형 배분·문항 계열 전수 매핑은 남아 있다.
3. 오늘 학습의 다중 탭 session revision 충돌 정책과 실제 사용자 데이터의 전 과정 QA. 자료실은 세션 ID+revision으로 오래된 선택을 거절하며 재조회를 제공한다.
4. 81개 미준비 설명과 여러 나라·가야 등 내부 목록 밖 공식 범위 검증. 전 범위 설명·이미지·전문가 승인·미노출 실전 출제는 P2다.
5. 목표 온보딩의 첫 방문 흐름과 공식 시험 회차/일정 선택기의 최신성 관리. 현재 설정 화면에서 시험 날짜를 직접 입력한다.
6. 공개 배포 접근 복구와 파일럿 사용자 검증. 코드·테스트 통과를 공개 반영으로 보고하지 않는다.

실제 배정은 [Cursor 기록](../cursor-tasks/README.md)을 따른다. 콘텐츠·자료실 재개·복습 이유 UI 3건을 인수했다. 이후 A 다중 창 충돌 재현·수정 설계와 B 학습 기록 화면을 추가 배정했다. A의 제안은 아직 구현 API가 아니며 B는 위의 기존 읽기 계약만 소비한다. 목표·분량·공통 API·DB/백업 통합과 전체 검증은 총괄이 수행한다.
