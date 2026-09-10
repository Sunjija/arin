# 개인별 일일 학습·복습 계약 v1

이 브랜치(`cursor/daily-review-loop-abb6`)가 새로 쓰는 학습 인터페이스다.  
기존 Dexie 테이블을 재사용하며 같은 역할의 스케줄러·저장소를 추가하지 않는다.

기준: `main` `a88ec9a`.

---

## 재사용

| 기존 | 역할 |
|---|---|
| `src/lib/spacedRepetition.ts` + `cards.nextReviewAt` | 간격 복습. 밀린 카드의 날짜를 조작하지 않음 |
| `src/lib/studyService.ts` | 세션 저장, 카드 평가, 오답, 모의 결과, 숙련도 갱신 |
| `src/lib/questionSelection.ts` | 유지. 오늘 고정 목록은 새 규칙 플래너가 담당 |
| `studyDays` / `activeSession` / `attempts` | 오늘 계획 스냅샷, 이어 하기, 답안 |

## 신규

| 모듈 | 역할 |
|---|---|
| `src/lib/dailyLearningPlan.ts` | 오늘 목록 선정(결정적, 날짜 주입) |
| `src/lib/dailyLearningService.ts` | Dexie 오케스트레이션 |
| `src/lib/clock.ts` | 학습일 주입. 로컬 캘린더 날짜 |
| `src/lib/questionSnapshot.ts` | 시도 시점 문항 스냅샷 |
| `src/lib/officialAnalysisAdapter.ts` | 기출 분석 산출물 수신 게이트. 수집 없음 |
| `src/lib/questionQualityAdapter.ts` | 실전 승인 vs 연습. 미검수를 승인처럼 쓰지 않음 |
| `src/lib/learningStorageAdapter.ts` | 이후 계정 동기화 컬렉션 목록 |

## 설정 필드 (기존 `settings` 행에 선택 필드)

```ts
goalGrade?: 1 | 2
examDate?: string | null
experienceLevel?: 'first-time' | 'has-experience'
onboardingCompleted?: boolean
diagnosticCompletedAt?: string | null
diagnosticSkipped?: boolean
```

목표를 바꿔도 `attempts`·진행 중 `activeSession.answered`·완료 `studyDays`를 지우지 않는다. 당일 `studyDays.plan`이 있으면 항목을 다시 뽑지 않는다.

## 오늘 계획 (`studyDays.plan`)

`FrozenDailyPlan`. 키는 학습일 `YYYY-MM-DD`.  
세션 id: `session-${date}` (전체), `session-${date}-short` (짧은 복습).  
`activeSession.clear()`로 다른 세션을 지우지 않는다.

## 시도 기록 확장

```ts
source: 'practice' | 'mock' | 'diagnostic'
outcomeKind?: 'first-correct' | 'repeat-correct' | 'after-help-correct' | 'unsure-correct' | 'incorrect' | 'unscored'
questionSnapshot?: AttemptQuestionSnapshot
```

진단(`diagnostic`)은 숙련도 점수를 올리지 않는다.

## 분석·품질 병렬 작업

- 기출 수집·관측 비율: `docs/contracts/official-exam-analysis-v1.md`
- 문항 은행 버전·모의 조립: PR `#8`. 이 브랜치는 `examMix`를 복제하지 않음
- 계정 동기화: `docs/contracts/account-sync-v1.md` + `LEARNING_SYNC_COLLECTIONS`

## 시간대

`device-local-calendar-date`. `toDateKey(Date)`의 로컬 연월일. 검증 시 `?asOf=YYYY-MM-DD` 또는 설정 → 학습일 미리보기.
