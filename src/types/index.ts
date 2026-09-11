/** 한국사 시대 구분 */
export type EraId =
  | 'prehistoric'
  | 'three-kingdoms'
  | 'north-south'
  | 'goryeo'
  | 'joseon-early'
  | 'joseon-late'
  | 'opening'
  | 'colonial'
  | 'modern'
  | 'culture'

/** 문제·숙련도 유형 */
export type QuestionType =
  | 'king-figure'
  | 'chronology'
  | 'source'
  | 'cultural-heritage'
  | 'independence-org'
  | 'political-system'

/**
 * 심화 시험 배점과 동일한 1·2·3 척도.
 * 최근 심화(77~79회) 정답표 기준: 1점 10문항 · 2점 30문항 · 3점 10문항.
 */
export type Difficulty = 1 | 2 | 3

export type WrongCause =
  | 'first-time'
  | 'confused-person'
  | 'confused-order'
  | 'missed-clue'
  | 'unknown'

export type CardRating = 'again' | 'hard' | 'good' | 'easy'

export type CardKind = 'king-to-deed' | 'deed-to-king' | 'chronology' | 'concept'

export type SessionStep = 'cards' | 'concept' | 'quiz' | 'result'

export interface Question {
  id: string
  stem: string
  passage?: string
  /** 심화는 5지선다, 연습·축소 모드는 4지선다 허용 */
  choices: string[]
  answerIndex: number
  explanation: string
  era: EraId
  tags: QuestionType[]
  /** 공식 심화 배점(1·2·3)에 맞춘 난이도 */
  difficulty: Difficulty
  source: string
  sourceUrl: string
  license: string
  imageRights: string
  lessonId?: string
  /** examFormats.ts의 ExamFormatId (선택; 없으면 휴리스틱 추정) */
  formatId?: string
  /** Explicit, reviewed scope; never inferred from answer/distractor keywords. */
  conceptIds?: string[]
  familyId?: string
  contentVersion?: number
  /** Observation only; difficulty remains the legacy point value. */
  stats?: { attemptCount: number | null; correctRate: number | null; discrimination: number | null }
}

export interface LessonGuide {
  lessonId: string
  contentVersion: number
  reviewStatus: 'draft' | 'source-checked' | 'approved'
  checkedAt: string
  introduction: string
  sections: Array<{
    conceptId: string
    title: string
    paragraphs: string[]
    recallPrompt: string
    expectedElements: string[]
    sourceUrl: string
    additionalSourceUrls?: string[]
  }>
}

export interface Lesson {
  id: string
  title: string
  era: EraId
  week: number
  dayOrder: number
  summary: string
  keywords: string[]
  checkpoints: string[]
  estimatedMinutes: number
}

export interface FlashcardSeed {
  id: string
  front: string
  back: string
  kind: CardKind
  era: EraId
  tags: QuestionType[]
  fromWrongAnswer?: boolean
}

export type GoalGrade = 1 | 2 | 3
export type ExperienceLevel = 'first-time' | 'has-experience'
export type ExamDateMode = 'scheduled' | 'undecided' | 'past'
export type ConceptLearnState = 'unseen' | 'learning' | 'completed'
export type LearningSource = 'today' | 'review' | 'library' | 'mock' | 'practice'
export type ReviewItemKind = 'due-review' | 'recent-wrong'

/** 목표·일정. dailyMinutes는 구형 백업 호환 필드이며 분량 약속이 아니다. */
export interface UserSettings {
  goalScore: number
  goalGrade?: GoalGrade
  dailyQuestionCount: number
  dailyCardCount: number
  dailyNewConceptCount?: number
  paceMode?: 'auto' | 'manual'
  conceptTargetDate?: string | null
  dailyMinutes: number
  focusTypes: QuestionType[]
  startDate: string
  planWeeks: number
  examRound?: number | null
  examDate?: string | null
  examDateUndecided?: boolean
  experienceLevel?: ExperienceLevel
  studyWeekdays?: number[]
  officialScheduleSource?: string | null
  officialScheduleCheckedAt?: string | null
  onboardingCompleted?: boolean
}

export type LearningGoal = Required<
  Pick<
    UserSettings,
    | 'goalScore'
    | 'goalGrade'
    | 'dailyQuestionCount'
    | 'dailyCardCount'
    | 'dailyNewConceptCount'
    | 'paceMode'
    | 'conceptTargetDate'
    | 'startDate'
    | 'planWeeks'
    | 'examRound'
    | 'examDate'
    | 'examDateUndecided'
    | 'experienceLevel'
    | 'studyWeekdays'
    | 'officialScheduleSource'
    | 'officialScheduleCheckedAt'
    | 'onboardingCompleted'
  >
>

export interface Concept {
  id: string
  title: string
  era: EraId
  lessonId?: string
  prerequisiteIds: string[]
  summary: string
  keywords: string[]
  source: string
  contentVersion: number
}

export interface ConceptProgressRecord {
  conceptId: string
  learnState: ConceptLearnState
  /** 복습 숙련(0~100). 미학습·열람만 있으면 null. 완료와 분리한다. */
  reviewMastery: number | null
  firstLearnedAt: string | null
  completedAt: string | null
  lastAttemptAt: string | null
  lastAttemptId: string | null
  viewedAt: string | null
}

export interface ReviewPlanItem {
  id: string
  kind: ReviewItemKind
  conceptId?: string
  questionId?: string
  cardId?: string
  dueOn: string
  reason: string
  failCount: number
  wrongCause?: WrongCause
}

export interface ConceptSchedule {
  courseVersion: string
  totalConcepts: number
  completedConcepts: number
  remainingConcepts: number
  readyRemainingConcepts: number
  unavailableConcepts: number
  targetDate: string
  studyDaysLeft: number
  recommendedPerDay: number | null
  selectedPerDay: number
  availableTodayIds: string[]
  nextConceptId: string | null
  blockedConceptId: string | null
  isStudyDay: boolean
  readyContentFinishDate: string | null
  allContentReadyFinishDate: string | null
  warnings: string[]
}


export interface FrozenStudyPlan {
  conceptSchedule?: ConceptSchedule
  policyVersion: string
  date: string
  createdAt: string
  currentLessonId: string
  currentConceptIds: string[]
  newQuestionIds: string[]
  reviewQuestionIds: string[]
  reviewCardIds: string[]
  newConceptCount: number
  newQuestionCount: number
  reviewQuestionCount: number
  reviewCardCount: number
  reasons: string[]
  warnings: string[]
  conceptFinishDate: string | null
  examDate: string | null
  examDateMode: ExamDateMode
  reviewPeriodStart: string | null
  remainingNewLessons: number
  missedStudyDays: number
  sameDayResume: boolean
}

export interface MasteryScores {
  eras: Record<EraId, number>
  types: Record<QuestionType, number>
}

export interface FlashcardRecord extends FlashcardSeed {
  createdAt: string
  updatedAt: string
  nextReviewAt: string
  intervalDays: number
  easeStreak: number
  lastRating?: CardRating
  lapses: number
  fingerprint: string
  /** 오답에서 만든 카드의 원문항 ID */
  sourceQuestionId?: string
  /** 당시 선지. 정답 인덱스만 저장하지 않는다. */
  sourceChoices?: string[]
  sourceAnswerIndex?: number
  sourcePassage?: string
  /** 사용자가 앞뒤를 고치면 시드 병합이 내용을 덮어쓰지 않는다. */
  userEdited?: boolean
}

export interface WrongAnswerRecord {
  id: string
  questionId: string
  selectedIndex: number
  correctIndex: number
  cause: WrongCause
  createdAt: string
  stem: string
  explanation: string
  era: EraId
  tags: QuestionType[]
  retryCorrect?: boolean
  retryAt?: string
}

export type ResponseMsSource = 'measured' | 'legacy-untrusted' | 'unavailable'

export interface AttemptRecord {
  id: string
  questionId: string
  correct: boolean
  selectedIndex: number
  /** 관찰된 활성 풀이 시간. 측정 불가면 null. */
  responseMs: number | null
  responseMsSource?: ResponseMsSource
  cause?: WrongCause
  era: EraId
  tags: QuestionType[]
  createdAt: string
  source: 'practice' | 'mock'
  /** 오늘 학습·복습·자료실·실전을 구분. 없으면 source로 추정. */
  learningSource?: LearningSource
  conceptId?: string
  snapshot?: QuestionSnapshot
  /** 동일 제출 재시도에서 중복 attempt를 묶는 키 */
  resultId?: string
}

export interface StudyDayRecord {
  date: string
  completed: boolean
  cardsReviewed: number
  conceptDone: boolean
  questionsAnswered: number
  correctCount: number
  lessonId?: string
  minutesSpent: number
  /** 측정할 수 없으면 false. 강제 최소 학습시간으로 채우지 않는다. */
  minutesMeasured?: boolean
  /** 같은 세션 finish 재호출이 통계를 중복 누적하지 않게 한다. */
  finishedSessionIds?: string[]
  /** 같은 날 고정된 학습 목록. 재개 시 다시 뽑지 않는다. */
  plan?: FrozenStudyPlan
}

export interface MockExamResult {
  id: string
  createdAt: string
  mode: 'full' | 'sample'
  total: number
  correct: number
  score: number
  durationSec: number
  answers: Array<{
    questionId: string
    selectedIndex: number | null
    correct: boolean
  }>
  byEra: Partial<Record<EraId, { correct: number; total: number }>>
  byType: Partial<Record<QuestionType, { correct: number; total: number }>>
}

export type StudyEntryMode = 'daily' | 'review'

/** Latest library practice run per lesson; independent from the daily session. */
export interface LibraryPracticeSession {
  id: string
  lessonId: string
  revision: number
  step: 'question' | 'feedback' | 'result'
  questionIndex: number
  selectedIndex: number | null
  questionSnapshots: QuestionSnapshot[]
  answers: SessionAnswer[]
  startedAt: string
  updatedAt: string
}

export interface ActiveSession {
  id: string
  date: string
  step: SessionStep
  lessonId: string
  cardIds: string[]
  cardIndex: number
  conceptDone: boolean
  conceptMemo: string
  questionIds: string[]
  questionIndex: number
  quizPhase: QuizPhase
  eraGuess?: EraId
  clueMemo: string
  selectedIndex?: number
  revealedChoices: boolean
  answered: SessionAnswer[]
  startedAt: string
  updatedAt: string
  /** daily: 카드→개념→문제. review: 카드만 마친 뒤 복습으로 돌아간다. */
  entryMode?: StudyEntryMode
  newQuestionIds?: string[]
  reviewQuestionIds?: string[]
  /** Frozen when the session starts; absent on legacy sessions. */
  questionSnapshots?: QuestionSnapshot[]
  /** Present on concept-scoped sessions; absent means legacy whole-lesson mode. */
  conceptIds?: string[]
  confirmedConceptIds?: string[]
  guideSnapshots?: LessonGuide[]
}

export type QuizPhase =
  | 'stem'
  | 'era'
  | 'clue'
  | 'choices'
  | 'feedback'
  | 'cause'

export interface SessionAnswer {
  questionId: string
  correct: boolean
  selectedIndex: number
  cause?: WrongCause
  responseMs: number | null
  eraGuess?: EraId
  clueMemo?: string
  attemptId?: string
}

export interface AppMeta {
  id: 'meta'
  seededAt: string
  /** 콘텐츠 시드 버전 — 올리며 카드 보강 재시드 */
  contentVersion?: number
  streak: number
  lastStudyDate: string | null
  estimatedScore: number
}

export interface LessonCompletion {
  lessonId: string
  firstCompletedAt: string
  lastCompletedAt: string
  completionCount: number
}

export interface QuestionSnapshot {
  questionId: string
  stem: string
  passage?: string
  choices: string[]
  answerIndex: number
  explanation: string
  era: EraId
  tags: QuestionType[]
  difficulty: Difficulty
  lessonId?: string
  conceptIds?: string[]
  familyId?: string
  contentVersion?: number
}

export type MockSessionStatus = 'in-progress' | 'submitted'

export interface ActiveMock {
  id: string
  revision: number
  mode: 'full' | 'sample'
  status: MockSessionStatus
  questionSnapshots: QuestionSnapshot[]
  answers: Array<number | null>
  /** 문항별 누적 활성 풀이 시간. 측정 불가면 null. */
  itemElapsedMs: Array<number | null>
  currentIndex: number
  startedAt: string
  deadlineAt: string
  updatedAt: string
  submittedResultId?: string
}

export interface ExportPayload {
  version: 1 | 2 | 3 | 4
  exportedAt: string
  settings: UserSettings
  mastery: MasteryScores
  cards: FlashcardRecord[]
  wrongAnswers: WrongAnswerRecord[]
  attempts: AttemptRecord[]
  studyDays: StudyDayRecord[]
  mockResults: MockExamResult[]
  activeSession: ActiveSession | null
  meta: AppMeta
  lessonCompletions?: LessonCompletion[]
  activeMock?: ActiveMock | null
  conceptProgress?: ConceptProgressRecord[]
  libraryPractice?: LibraryPracticeSession[]
}

export const ERA_LABELS: Record<EraId, string> = {
  prehistoric: '선사·고조선',
  'three-kingdoms': '여러 나라·삼국',
  'north-south': '남북국',
  goryeo: '고려',
  'joseon-early': '조선 전기',
  'joseon-late': '조선 후기',
  opening: '개항기',
  colonial: '일제강점기',
  modern: '현대',
  culture: '문화사',
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  'king-figure': '왕·인물',
  chronology: '연도·사건 순서',
  source: '사료',
  'cultural-heritage': '문화재',
  'independence-org': '독립운동 단체',
  'political-system': '정치 제도',
}

export const WRONG_CAUSE_LABELS: Record<WrongCause, string> = {
  'first-time': '처음 보는 내용',
  'confused-person': '왕·인물을 혼동함',
  'confused-order': '사건 순서가 헷갈림',
  'missed-clue': '사료의 단서를 놓침',
  unknown: '미확인',
}

export const CARD_RATING_LABELS: Record<CardRating, string> = {
  again: '모름',
  hard: '헷갈림',
  good: '맞음',
  easy: '너무 쉬움',
}

export const ALL_ERAS: EraId[] = [
  'prehistoric',
  'three-kingdoms',
  'north-south',
  'goryeo',
  'joseon-early',
  'joseon-late',
  'opening',
  'colonial',
  'modern',
  'culture',
]

export const ALL_TYPES: QuestionType[] = [
  'king-figure',
  'chronology',
  'source',
  'cultural-heritage',
  'independence-org',
  'political-system',
]

export type {
  BackupRestoreResult,
  CreateWrongCardResult,
  DataErrorCode,
  FinalizeMockResult,
  FullMockIneligibilityReason,
  ProgressSnapshot,
  QuantityPlan,
  RecentMockSummary,
  RecordAttemptInput,
  SaveMockProgressInput,
  SaveMockProgressResult,
  ScoreSummary,
  StartMockInput,
  StartMockResult,
  StartStudyInput,
  TodayCompletion,
  TodayPlan,
  WeakArea,
} from './contracts'
