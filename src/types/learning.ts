/**
 * E 공통 학습 기반 — API 입출력 타입.
 * 저장 엔티티는 `src/types/index.ts`. 화면은 이 모듈의 함수 결과만 소비한다.
 */
import type {
  ActiveSession,
  ConceptProgressRecord,
  ExamDateMode,
  FrozenStudyPlan,
  LearningGoal,
  LearningSource,
  Question,
  QuestionSnapshot,
  ReviewPlanItem,
  WrongCause,
} from './index'
import type { DataErrorCode } from './contracts'

export type LearningResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: DataErrorCode; message: string }

export interface SaveGoalInput {
  goalGrade?: LearningGoal['goalGrade']
  goalScore?: number
  examRound?: number | null
  examDate?: string | null
  examDateUndecided?: boolean
  experienceLevel?: LearningGoal['experienceLevel']
  studyWeekdays?: number[]
  officialScheduleSource?: string | null
  officialScheduleCheckedAt?: string | null
  dailyQuestionCount?: number
  dailyCardCount?: number
  dailyNewConceptCount?: number
  startDate?: string
  planWeeks?: number
  onboardingCompleted?: boolean
}

export interface StartLessonInput {
  today?: string
  entryMode?: 'daily' | 'review'
  lessonId?: string
}

export interface RecordLearningAnswerInput {
  question: Question
  selectedIndex: number
  correct: boolean
  responseMs: number | null
  cause?: WrongCause
  learningSource: LearningSource
  resultId?: string
  attemptId?: string
  snapshot?: QuestionSnapshot
}

export interface RecordConceptViewInput {
  conceptId: string
  at?: string
}

export interface ReviewSelection {
  date: string
  dueItems: ReviewPlanItem[]
  recentWrongItems: ReviewPlanItem[]
  cardIds: string[]
  questionIds: string[]
  reasons: string[]
}

export interface CompleteSessionResult {
  session: ActiveSession
  created: boolean
}

export type { ConceptProgressRecord, ExamDateMode, FrozenStudyPlan, LearningGoal }
