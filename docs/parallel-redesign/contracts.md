# 한사코치 1차 개편 — 확정 계약 (단계 0)

이 문서는 구현된 타입·API와 함께 동결한다. 문서만 있고 코드가 없는 stub이 아니다. props/signature를 구현 도중 임의로 바꾸지 말고, 필요하면 총괄을 통해 이 파일을 고친다.

기준: `main` `a88ec9a`. 콘텐츠 규모: 문항 100 · 단원 18 · 카드 95 · 연표 70. `src/data` 원문은 읽기 전용.

---

## A. UI 계약

### 토큰 (`src/index.css`)

| 토큰 | 값 |
|---|---|
| `--bg` | `#F4F5F2` |
| `--bg-elevated` | `#FFFFFF` |
| `--ink` | `#17201C` |
| `--ink-muted` | `#65706A` |
| `--line` | `#DCE2DE` |
| `--accent` | `#155E56` |
| `--accent-soft` | `#E5F2EE` |
| `--correct` / `--correct-soft` | `#267454` / `#E4F3EB` |
| `--wrong` / `--wrong-soft` | `#A5453E` / `#F9E9E7` |
| `--space-1…6` | 4 / 8 / 12 / 16 / 24 / 32px |
| `--text-body` | 16px |
| `--text-passage` | 17px, 줄높이 1.7 (`.passage-text`) |
| `--text-choice` | 16px, 줄높이 1.6 (`.choice-text`) |
| `--text-meta` | 13px+ |
| `--text-nav` | 12px+ |
| `--text-title` | 모바일 26px, 데스크톱 32px |
| `--radius-card` / `--radius-button` | 16px / 12px |
| `--max-page` / `--max-focus` | 1120px / 720px |
| `--page-gutter` | 모바일 16px |

기존 `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.choice-option` class는 유지한다. `.btn:disabled` 투명도는 `.choice-option`에 적용되지 않는다. 핵심 카드만 `.surface-raised`로 그림자를 켠다.

### 메뉴

데스크톱·모바일 동일 5개:

| 이름 | 경로 | 활성 URL |
|---|---|---|
| 오늘 | `/` | `/`, `/study` |
| 복습 | `/cards` | `/cards`, `/wrong` |
| 자료실 | `/timeline` (F 이후 `/library`) | `/timeline`, `/library` |
| 실전 | `/mock` | `/mock` |
| 내 기록 | `/progress` | `/progress`, `/settings` |

`/study` 탭은 추가하지 않는다. `/wrong` → `/cards` 유지. 기존 URL은 제거하지 않는다.

자료실 URL query (F가 구현, A가 셸에서 간섭하지 않음):

- `tab=timeline|concepts`
- `era=`
- `q=`
- `sort=asc|desc` (오래된 순 / 최근 순)

상수는 `src/components/layout/navConfig.ts`의 `LIBRARY_QUERY_KEYS`.

### Focus layout

```ts
import { FocusLayoutProvider } from '../components/layout/FocusLayout'
import { useFocusLayout } from '../components/layout/useFocusLayout'

useFocusLayout(true)   // 학습 실행 중, 모의 시험 실행 중만
useFocusLayout(false)  // 모의 준비/결과, 학습 결과 후 나가기
```

- Provider는 `App.tsx`에 이미 있다.
- `true`이면 전역 헤더·하단 메뉴를 숨긴다. 닫기/진행은 페이지 담당이 배치한다. 셸에 닫기를 중복하지 않는다.
- AppShell은 `/mock` URL만 보고 전체를 focus로 처리하지 않는다.
- 언마운트 시 `false`로 복구된다. 다른 화면에 focus가 남으면 결함이다.

### 컴포넌트

`import { Button, ChoiceOption, EmptyState, InlineStatus, PageHeader, Dialog } from '../components/ui'`

```ts
<Button variant="primary" | "secondary" | "text" | "destructive">…

<ChoiceOption
  index={0}
  label="광종"
  state="unselected" | "selected" | "correct" | "incorrect" | "locked"
  onSelect={() => { /* 선택 */ }}
/>
// correct → "정답", incorrect → "내 답 · 오답", opacity 1

<PageHeader eyebrow="계획 2주차" title="오늘 학습: 고려 광종과 성종" />
<EmptyState title="아직 기록 없음">첫 학습 후 기록이 쌓여요.</EmptyState>
<InlineStatus tone="neutral" | "success" | "error">저장했습니다.</InlineStatus>
<Dialog open={open} title="카드 수정" onClose={close}>…</Dialog>
```

클래스 호환 예시 (Link 등): `className="btn btn-primary"`. 채점된 선지는 `disabled` + `.choice-option`이며 글자가 흐려지지 않는다.

하단 고정 CTA는 `.cta-dock`으로 safe-area를 확보한다. 읽기 폭은 `.focus-reading` 또는 `.app-shell.is-focus`.

---

## E. 데이터 계약

### 성적 요약

`import { getScoreSummary } from '../lib/studyService'`
또는 `buildScoreSummary` (`src/lib/scoreSummary.ts`).

```ts
interface ScoreSummary {
  practiceAccuracy: number | null      // practice 시도만
  practiceAttemptCount: number
  fullMockAverage: number | null       // 적격 full 최근 최대 3회 동일 가중 산술평균
  eligibleFullMockCount: number
  consecutiveGoalHits: number          // 적격 full만, 최신부터 목표 이상 연속
  goalScore: number
  recentMocks: RecentMockSummary[]
}
```

값 없음은 `null`. 0은 실제 0일 때만. 문구: “연습 정답률”, “최근 실전 연습 평균”, “목표 점수 연속 달성”. “예상 시험 점수 / 1급 안정권 / 합격 확률”은 쓰지 않는다.

full 적격: `mode=full`, 원본 고유 문항 50, 점수/답안 유효, `__pad` 없음. 같은 결과 ID는 한 번만. sample은 평균·연속에 넣지 않는다.

### TodayPlan

`buildTodayPlan(today?: string): Promise<TodayPlan>`

- `lesson`: 주 번호 + 주 내 날짜 + `dayOrder`로 예정 단원을 배정한다. 주차 첫 `find`를 쓰지 않는다. 주 내 단원이 7일보다 적으면 남은 날은 그 주 단원을 순환(반복 학습일). 계획 주수가 끝나면 18개 단원 전체를 날짜 기준으로 순환한다. 활성 세션 `lessonId`는 재개 시 바꾸지 않음.
- `reviewLabel` + `reviewHasEvidence`: 복습 한 줄. 근거 없으면 “기초 복습”.
- `quantity.selectedCardCount` / `selectedQuestionCount`가 화면에 쓸 실제 수.
- `dailyQuestionCount` / `dailyCardCount`는 상한. 설명 문구: `quantitySettingsCopy()`.
- 하루 시간에 최소 학습이 안 되면 `fitsDailyMinutes=false`, `guidance`를 숨기지 않음. 개념 읽기 시간을 0으로 만들지 않음.
- `completion.todayDone`이면 CTA는 추가 복습. 완료율을 0으로 리셋하지 않음.
- `weakAreas`: 호환용 라벨 문자열. B는 `observedWeakAreas`(관측된 영역만)를 쓴다. 초기 숙련도 숫자는 진단이 아니다.
- 호환 필드 `estimatedScore`/`estimated`는 `estimatedScoreFromRecords`(적격 실전 평균, 없으면 최근 40개 답안 정답률)이며 홈과 진도가 같은 함수를 쓴다. 값이 없으면 `null`. B는 `scoreSummary`를 쓴다.

### 학습 세션

```ts
startOrResumeSession(today?: string | { today?: string; entryMode?: 'daily' | 'review' })
saveSession(session)
finishSession(session)           // session.id 기준 idempotent, 당일 통계 누적
recordQuizAnswer({ question, selectedIndex, correct, responseMs: number | null, cause?, source, attemptId?, resultId? })
updateAttemptCause(attemptId, cause)
```

- `entryMode: 'review'` → 카드만. 끝나면 복습으로 돌아간다. 일반 `/study` 전체를 강제하지 않는다.
- `responseMs` 측정 불가면 `null`. 20초 상수를 넣지 않는다. null에 속도 가감점 없음.
- 오답 원인 기본 `unknown`. 건너뛰어도 오답 저장. 이후 `updateAttemptCause`로 같은 attempt 갱신.
- `finishSession`은 최소 10분을 강제하지 않는다. `minutesMeasured`로 구분.

### 모의 세션

```ts
import { startMock, saveMockProgress, finalizeMock, getActiveMock, SAMPLE_DURATION_MS, FULL_DURATION_MS } from '../lib/mockSession'
import { inspectFullMockPool } from '../lib/mockEligibility'

inspectFullMockPool(snapshots) // { ok, uniqueCount }  full은 고유 50, pad 금지
startMock({ mode, snapshots, durationMs, replaceExisting? })
saveMockProgress({ id, revision, answers, currentIndex, itemElapsedMs })
finalizeMock({ id, revision?, answers?, itemElapsedMs? }) // 결과 ID = mock.id, idempotent
saveMockResult(result) // 구형 페이지 경로. 동일 result.id 재호출 시 중복 attempt 없음. responseMs null, cause unknown
```

- 샘플 16분, 실전 80분. 실전 마감은 `deadlineAt`.
- 진행 중 시험이 있으면 `conflict` + 기존 mock. 새로 시작은 `replaceExisting: true`와 사용자 확인 후.
- 늦은 save는 `revision`이 작으면 `stale-revision`.
- 미응답은 `selectedIndex: null`. 임의 선지/원인을 만들지 않음.

### 오답 카드

```ts
import { createWrongCardFromQuestion, updateCardContent } from '../lib/wrongCard'
import { buildWrongCardFront, resolveQuestionSource } from '../lib/wrongCardContent'

await createWrongCardFromQuestion({ questionId, snapshot? })
// ok:false reason:'source-missing' → 무의미한 카드를 만들지 말고 편집 안내
```

지문 의존 문항은 앞면에 passage+stem. 선지 원문과 정답 인덱스를 카드에 보존. fingerprint 중복 방지. 사용자 편집/`fromWrongAnswer` 카드는 시드 병합이 앞뒤를 덮지 않음.

### 백업

```ts
exportAllData()           // version 2, lessonCompletions·activeMock 포함
restoreBackup(raw)        // 실패 시 기존 DB 불변. { ok:false, message }
importAllData(payload)    // 실패 시 throw. 구형 version 1 지원
clearAllLearningData()    // 전체 초기화. 복원과 혼동하지 말 것
quantitySettingsCopy()    // 설정 화면 설명
```

Dexie v2 업그레이드. DB 삭제/reseed로 migration하지 않는다.

### 전환

| 구형 | 신규 |
|---|---|
| `estimatedScore` / `estimateScoreFromAccuracy(0,0)=40` | `scoreSummary.*` null |
| `isStableZone` / “1급 안정권” | `consecutiveGoalHits` |
| `lessons.find(week)` | `selectScheduledLesson` (주+dayOrder, 반복일·계획 종료 후 순환) |
| `addCardFromContent({ front: stem })` | `createWrongCardFromQuestion` |
| `saveMockResult` + `responseMs: 20000` | `startMock`/`finalizeMock`, `responseMs: null` |
| Home `focusLine`에 취약 영역 | `오늘 학습: {lesson.title}` + 별도 `reviewLabel` |

기존 페이지는 단계 0에서 컴파일되도록 호환 필드를 남긴다. B/C/D가 구형 필드와 금지 문구를 제거한다.

---

## 담당별 즉시 연결 예시

**B**
```ts
const plan = await buildTodayPlan()
plan.lesson.title
plan.reviewLabel
`${plan.reviewCardCount}장 · 개념 1개 · 문제 ${plan.questionCount}개 · 약 ${plan.estimatedMinutes}분`
plan.completion.todayDone ? '추가 복습' : (activeSession ? '이어서 학습' : '오늘 학습 시작')
const summary = plan.scoreSummary
summary.practiceAccuracy ?? '아직 기록 없음'
```

**C**
```ts
useFocusLayout(session.step !== 'result')
await saveSession(session)
const attempt = await recordQuizAnswer({ ..., responseMs, cause: 'unknown' })
await updateAttemptCause(attempt.id, cause)
const card = await createWrongCardFromQuestion({ questionId: q.id, snapshot })
```

**D**
```ts
if (mode === 'full' && !inspectFullMockPool(snapshots).ok) { /* 10문항 안내 */ }
const started = await startMock({ mode, snapshots, durationMs: FULL_DURATION_MS })
useFocusLayout(running)
await saveMockProgress({ id, revision, answers, currentIndex, itemElapsedMs })
await finalizeMock({ id, answers, itemElapsedMs })
```

**F**
```ts
export function LibraryPage() { /* 연표/개념 탭. 헤더 중복 금지 */ }
// A가 App.tsx에 /library를 연결할 때까지 이 파일을 제공
```
