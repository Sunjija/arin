# E 공통 학습 기반 — 재사용 결정과 동결 API

기준 SHA: `59c3ae0` (`codex/arin-design-v3`). 구현 브랜치: `cursor/learning-foundation-e-6a37`.

## 기존 PR 대조

| 개념 | PR #12 | PR #11 | PR #8 / 기준 브랜치 | 결정 |
|---|---|---|---|---|
| 목표 | `goalGrade`, `examDate`, `experienceLevel` | — | `goalScore`, `planWeeks`, `dailyMinutes` | #12 필드 재사용. 회차·출처·확인일·학습 요일 추가. `dailyMinutes`는 백업 호환만 |
| 개념 | `TOPIC_CATALOG` 매핑 | 분석 토픽 | `Lesson`이 진도 단위 | 카탈로그=개념, 단원 완료=진도. `culture` ID 유지 |
| 문항 | 품질 어댑터 | `items.jsonl` 관측 | `Question` + `formatId` | 기존 `Question` 유지. 스냅샷·개념 연결만 추가 |
| 평가 | `AttemptOutcomeKind` | 배점 vs 태그 | `Difficulty`=배점 | 배점과 숙련도를 분리. 반복 정답≠숙달 |
| 시도 | `AttemptQuestionSnapshot` | — | `AttemptRecord` | 기존 테이블 확장: `learningSource`, `snapshot`, `conceptId` |
| 개념 진도 | 파생 `ConceptProgress` | — | `LessonCompletion` | 저장 테이블 `conceptProgress`. 미학습/학습중/완료 ≠ 복습 숙련 |
| 복습 | `review-due` vs `recent-weak` | — | 오답 ID를 도래 ID로 재사용 | 분리. 미학습 시대 카드 자동 복습 금지 |
| 세션 | 당일 고정 계획 | — | `ActiveSession` | 당일 `FrozenStudyPlan` 고정. 기존 세션 재개 보존 |

#7·#9·#10(동기화·모바일·결제)은 범위 밖. 자동 병합하지 않음.

## 동결 API (`src/lib/learningApi.ts`)

소유: E. B/C/F/D는 이 경로만 소비하고 별도 저장소를 만들지 않는다.

| 함수 | 인자 | 성공 | 실패 | 소비 예 |
|---|---|---|---|---|
| `saveGoal` | `SaveGoalInput` | `{ ok:true, value: LearningGoal }` | `validation-failed`, `save-failed` | 설정 화면에서 급수·시험일·요일 저장 |
| `getGoal` | — | `LearningGoal` | `not-found` | 홈 목표 줄 |
| `computeStudyPlan` | `today?` | `FrozenStudyPlan` | `not-found` | 홈 오늘 분량. 같은 날 재사용 |
| `startLesson` | `{ today?, entryMode?, lessonId? }` | `ActiveSession` | `not-found` | 오늘 학습 시작. 진행 중이면 재개 |
| `recordAnswer` | `RecordLearningAnswerInput` | `AttemptRecord` | 기존 attempt 반환(중복) | 오늘·복습·자료실·실전 공통 |
| `recordConceptView` | `{ conceptId, at? }` | `ConceptProgressRecord` | — | 자료실 열람. 완료 아님 |
| `selectReview` | `today?` | `ReviewSelection` | — | 복습 목록. 도래와 최근 오답 분리 |
| `completeSession` | `ActiveSession` | `{ session, created }` | 재호출 시 `created:false` | 결과 화면. `conceptDone`일 때만 단원 완료 |

기존 `studyService.startOrResumeSession` / `recordQuizAnswer` / `finishSession` / `buildTodayPlan`은 위 API를 호출한다.

## 마이그레이션

- Dexie v3: `conceptProgress` 테이블 추가. 기존 카드·세션·모의 답안·사용자 편집 카드 유지.
- 백업 v3 export. v1·v2 import 허용, 설정 필드 정규화. 실패 시 기존 DB 불변.
- `dailyMinutes`·달력 `selectScheduledLesson`는 호환용. 진도 선택은 `selectNextLesson`.
