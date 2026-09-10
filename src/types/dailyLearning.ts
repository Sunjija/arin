import type { EraId, QuestionType } from './index'

export const OFFICIAL_EXAM_ANALYSIS_SCHEMA = 'official-exam-analysis-v1' as const

export type GoalGrade = 1 | 2
export type ExperienceLevel = 'first-time' | 'has-experience'
export type SessionStudyMode = 'full' | 'short-review'

export type AttemptOutcomeKind =
  | 'first-correct'
  | 'repeat-correct'
  | 'after-help-correct'
  | 'unsure-correct'
  | 'incorrect'
  | 'unscored'

export type ConceptMemoryState =
  | 'unseen'
  | 'learning'
  | 'remembered'
  | 'needs-check'
  | 'applied'

export type PlanItemKind = 'review-due' | 'recent-weak' | 'new-concept' | 'transfer'

export type PlanItemSourceNote = 'reuse' | 'approved-transfer' | 'not-ready'

export type EstimateKind = 'heuristic' | 'calibrated'

export type MixBasis = 'provisional' | 'partial' | 'analyzed'

export type AnalysisReviewLevel =
  | 'raw-collect'
  | 'outline-only'
  | 'partial-tags'
  | 'human-reviewed-complete'

export interface AttemptQuestionSnapshot {
  questionId: string
  stem: string
  passage?: string
  choices: string[]
  answerIndex: number
  explanation: string
  formatId?: string
  lessonId?: string
  era: EraId
  tags: QuestionType[]
  capturedAt: string
}

export interface DailyPlanItem {
  id: string
  kind: PlanItemKind
  conceptId: string
  conceptTitle: string
  lessonId?: string
  cardIds: string[]
  questionIds: string[]
  reason: string
  sourceNote?: PlanItemSourceNote
  completed?: boolean
}

export interface ExamPressure {
  examDate: string | null
  daysLeft: number | null
  remainingLessons: number
  remainingMinutesEstimate: number
  availableMinutes: number
  feasible: boolean
  message: string
}

export interface FrozenDailyPlan {
  policyVersion: string
  date: string
  createdAt: string
  items: DailyPlanItem[]
  composition: {
    reviewDue: number
    recentWeak: number
    newConcept: number
    transfer: number
  }
  estimatedMinutes: number
  estimateKind: EstimateKind
  overdueDeferredCount: number
  reasons: string[]
  warnings: string[]
  contentNotes: string[]
  examPressure: ExamPressure | null
  mixBasis: MixBasis
}

export interface ConceptProgress {
  conceptId: string
  title: string
  lessonId?: string
  memory: ConceptMemoryState
  applicationReady: boolean
  evidence: string
}

export interface OfficialExamAnalysisPayload {
  schemaVersion: typeof OFFICIAL_EXAM_ANALYSIS_SCHEMA
  producedBy: string
  producedAt: string
  source: {
    corpus: string
    rounds: number[]
    itemCount: number
    includesOfficialText: boolean
    includesOfficialImages: boolean
  }
  review: {
    level: AnalysisReviewLevel
    reviewerId: string | null
    reviewedAt: string | null
    notes: string
  }
  coverage: {
    targetItemCount: number
    taggedComplete: number
    outlineOnly: number
    notAnalyzed: number
  }
  observed: {
    pointQuota: { 1: number; 2: number; 3: number } | null
    eraBloc: { premodern: number; modern: number } | null
    formatMix: Record<string, number> | null
    officialSkillType: Record<string, number> | null
    stimulusType: Record<string, number> | null
  }
  items: Array<{
    round: number
    number: number
    analysisStatus: 'not-analyzed' | 'outline-only' | 'complete'
    points: 1 | 2 | 3 | null
    era: string | null
    topic: string | null
    officialSkillType: string | null
    internalFormatId: string | null
    stimulusType: string | null
    visualRequired: boolean | null
    tagConfidence: 'unset' | 'estimate' | 'confirmed'
    notes: string
  }>
}

export interface AnalysisAcceptance {
  accepted: boolean
  basis: MixBasis
  reviewLevel: AnalysisReviewLevel | 'absent'
  rejection: string | null
  label: string
}

export interface QuestionUseClass {
  questionId: string
  practiceOk: boolean
  diagnosticOk: boolean
  examApproved: boolean
  gaps: string[]
}

export interface TodayView {
  date: string
  onboardingCompleted: boolean
  plan: FrozenDailyPlan
  headline: string
  reasonLine: string
  timeLine: string
  primaryAction: 'setup' | 'start' | 'resume' | 'review-more'
  primaryLabel: string
  shortReviewAvailable: boolean
  sessionInProgress: boolean
  todayFullDone: boolean
  todayShortDone: boolean
  demoContent: boolean
  nextReviewHint: string | null
  readinessNote: string
}
