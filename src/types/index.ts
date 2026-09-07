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

export interface UserSettings {
  goalScore: number
  dailyQuestionCount: number
  dailyCardCount: number
  dailyMinutes: number
  focusTypes: QuestionType[]
  startDate: string
  planWeeks: number
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

export interface AttemptRecord {
  id: string
  questionId: string
  correct: boolean
  selectedIndex: number
  responseMs: number
  cause?: WrongCause
  era: EraId
  tags: QuestionType[]
  createdAt: string
  source: 'practice' | 'mock'
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
  responseMs: number
  eraGuess?: EraId
  clueMemo?: string
}

export interface AppMeta {
  id: 'meta'
  seededAt: string
  streak: number
  lastStudyDate: string | null
  estimatedScore: number
}

export interface ExportPayload {
  version: 1
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
