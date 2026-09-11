/**
 * 한사코치 1차 개편 — 화면 담당이 import하는 데이터 계약.
 * 구현은 src/lib, src/db. 이 파일은 타입과 결과 유니온만 둔다.
 */
import type {
  ActiveMock,
  ActiveSession,
  AttemptRecord,
  EraId,
  ExamDateMode,
  FlashcardRecord,
  FrozenStudyPlan,
  LearningSource,
  Lesson,
  LessonCompletion,
  MockExamResult,
  QuestionSnapshot,
  QuestionType,
  StudyDayRecord,
  StudyEntryMode,
  WrongCause,
} from './index'

export type DataErrorCode =
  | 'not-found'
  | 'validation-failed'
  | 'conflict'
  | 'stale-revision'
  | 'unsupported-backup'
  | 'import-invalid'
  | 'already-finalized'
  | 'insufficient-pool'
  | 'source-missing'
  | 'save-failed'

export type FullMockIneligibilityReason =
  | 'sample-mode'
  | 'padded-questions'
  | 'insufficient-unique-questions'
  | 'invalid-score'
  | 'invalid-answers'
  | 'duplicate-id'

export interface RecentMockSummary {
  id: string
  createdAt: string
  mode: 'full' | 'sample'
  score: number
  total: number
  eligibleForFullStats: boolean
  ineligibilityReason?: FullMockIneligibilityReason
}

export interface ScoreSummary {
  practiceAccuracy: number | null
  practiceAttemptCount: number
  fullMockAverage: number | null
  eligibleFullMockCount: number
  consecutiveGoalHits: number
  goalScore: number
  recentMocks: RecentMockSummary[]
}

export interface WeakArea {
  key: EraId | QuestionType
  kind: 'era' | 'type'
  label: string
  attemptCount: number
  accuracy: number | null
  measured: boolean
}

export interface QuantityPlan {
  dailyMinutes: number
  dailyQuestionCap: number
  dailyCardCap: number
  selectedCardCount: number
  selectedQuestionCount: number
  estimatedMinutes: number
  fitsDailyMinutes: boolean
  overflowMinutes: number
  /** heuristic: 참고 추정. 분량 상한으로 쓰지 않는다. */
  estimateKind?: 'heuristic' | 'none'
  newQuestionCount?: number
  reviewQuestionCount?: number
  /** 화면/설정에 그대로 쓸 안내. 넘치면 숨기지 않는다. */
  guidance: string | null
}

export interface TodayCompletion {
  todayDone: boolean
  cardsReviewed: number
  questionsAnswered: number
  conceptDone: boolean
  extraReviewAvailable: boolean
}

export interface TodayPlan {
  date: string
  week: number
  planWeeks: number
  lesson: Lesson
  reviewLabel: string
  reviewHasEvidence: boolean
  dueCards: FlashcardRecord[]
  quantity: QuantityPlan
  reviewCardCount: number
  questionCount: number
  estimatedMinutes: number
  completion: TodayCompletion
  scoreSummary: ScoreSummary
  observedWeakAreas: WeakArea[]
  streak: number
  /**
   * @deprecated B는 scoreSummary를 쓴다. 측정값이 없으면 null.
   * 호환 필드 — 단계 0에서 기존 홈이 깨지지 않게 유지.
   */
  estimatedScore: number | null
  scoreIsEstimate: boolean
  goalScore: number
  remainingToGoal: number | null
  focusLine: string
  timeLine: string
  todayDone: boolean
  completionRate: number
  /** @deprecated B는 observedWeakAreas. 라벨 배열. */
  weakAreas: string[]
  conceptFinishDate?: string | null
  examDateMode?: ExamDateMode
  planWarnings?: string[]
  newQuestionCount?: number
  reviewQuestionCount?: number
  frozenPlan?: FrozenStudyPlan
}

export interface ProgressSnapshot {
  scoreSummary: ScoreSummary
  weakAreas: WeakArea[]
  recentStudy: StudyDayRecord[]
  lessonCompletions: LessonCompletion[]
  masteryInternal: { eras: Record<EraId, number>; types: Record<QuestionType, number> }
  /** @deprecated B는 관측 weakAreas. 내부 숙련도 막대는 단계 1에서 접는다. */
  mastery: { eras: Record<EraId, number>; types: Record<QuestionType, number> }
  topCause: WrongCause | undefined
  advice: string
  /** @deprecated B는 scoreSummary.fullMockAverage */
  estimated: number | null
  scoreIsEstimate: boolean
  /** @deprecated B는 scoreSummary.consecutiveGoalHits */
  streak85: number
  stable: boolean
  mockScores: number[]
  accuracy7: number | null
  weak: string[]
}

export type CreateWrongCardResult =
  | { ok: true; card: FlashcardRecord; created: boolean }
  | { ok: false; reason: 'source-missing'; questionId: string }

export type BackupRestoreResult =
  | { ok: true; importedVersion: 1 | 2 | 3 | 4 }
  | { ok: false; code: 'import-invalid' | 'unsupported-backup'; message: string }

export interface FinalizeMockResult {
  result: MockExamResult
  created: boolean
}

export interface SaveMockProgressInput {
  id: string
  revision: number
  answers: Array<number | null>
  currentIndex: number
  itemElapsedMs: Array<number | null>
}

export type SaveMockProgressResult =
  | { ok: true; mock: ActiveMock }
  | { ok: false; code: 'stale-revision' | 'not-found' | 'already-finalized'; mock?: ActiveMock }

export interface StartMockInput {
  mode: 'full' | 'sample'
  snapshots: QuestionSnapshot[]
  durationMs: number
  /** 진행 중 시험이 있을 때 true면 기존 진행을 버린다. */
  replaceExisting?: boolean
}

export type StartMockResult =
  | { ok: true; mock: ActiveMock }
  | {
      ok: false
      code: 'conflict' | 'insufficient-pool'
      activeMock?: ActiveMock
      uniqueCount?: number
    }

export interface StartStudyInput {
  today?: string
  entryMode?: StudyEntryMode
}

export interface RecordAttemptInput {
  questionId: string
  snapshot?: QuestionSnapshot
  selectedIndex: number
  correct: boolean
  responseMs: number | null
  cause?: WrongCause
  source: 'practice' | 'mock'
  learningSource?: LearningSource
  era: EraId
  tags: QuestionType[]
  resultId?: string
  attemptId?: string
}

export type { ActiveMock, ActiveSession, AttemptRecord, QuestionSnapshot, StudyEntryMode }
