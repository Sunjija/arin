import { lessons } from '../data/lessons'
import { questions } from '../data/questions'
import { cardFingerprint } from './cardFingerprint'
import { addDays, daysBetween, isDue, planWeekNumber, toDateKey } from './dates'
import { updateMasteryScore, weakestKeys } from './mastery'
import { selectDailyQuestions } from './questionSelection'
import {
  consecutiveAboveThreshold,
  estimateScoreFromAccuracy,
  estimateScoreFromMocks,
  isStableZone,
} from './scoreEstimate'
import { calculateNextInterval } from './spacedRepetition'
import { db } from '../db/database'
import type {
  ActiveSession,
  AttemptRecord,
  CardRating,
  EraId,
  FlashcardRecord,
  MasteryScores,
  MockExamResult,
  Question,
  QuestionType,
  SessionAnswer,
  StudyDayRecord,
  UserSettings,
  WrongAnswerRecord,
  WrongCause,
} from '../types'
import { ALL_ERAS, ALL_TYPES, ERA_LABELS } from '../types'

export interface TodayPlan {
  date: string
  lesson: (typeof lessons)[number]
  dueCards: FlashcardRecord[]
  reviewCardCount: number
  questionCount: number
  estimatedMinutes: number
  estimatedScore: number
  scoreIsEstimate: boolean
  goalScore: number
  remainingToGoal: number
  weakAreas: string[]
  streak: number
  week: number
  planWeeks: number
  completionRate: number
  focusLine: string
  summaryLine: string
  timeLine: string
  todayDone: boolean
}

export async function getSettings(): Promise<UserSettings> {
  const row = await db.settings.get('settings')
  if (!row) throw new Error('설정이 없습니다.')
  const { id: _id, ...settings } = row
  return settings
}

export async function getMastery(): Promise<MasteryScores> {
  const row = await db.mastery.get('mastery')
  if (!row) throw new Error('숙련도 데이터가 없습니다.')
  const { id: _id, ...mastery } = row
  return mastery
}

export async function buildTodayPlan(today = toDateKey()): Promise<TodayPlan> {
  const [settings, mastery, cards, meta, studyDay, mocks, attempts] = await Promise.all([
    getSettings(),
    getMastery(),
    db.cards.toArray(),
    db.meta.get('meta'),
    db.studyDays.get(today),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
    db.attempts.orderBy('createdAt').reverse().limit(80).toArray(),
  ])

  const week = planWeekNumber(settings.startDate, today, settings.planWeeks)
  const lesson =
    lessons.find((l) => l.week === week) ??
    lessons[Math.min(week - 1, lessons.length - 1)] ??
    lessons[0]

  const dueCards = cards
    .filter((c) => isDue(c.nextReviewAt, today))
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
    .slice(0, settings.dailyCardCount)

  const mockScores = mocks.map((m) => m.score)
  const fromMocks = estimateScoreFromMocks(mockScores)
  const recent = attempts.slice(0, 40)
  const fromPractice = estimateScoreFromAccuracy(
    recent.filter((a) => a.correct).length,
    recent.length,
  )
  const estimatedScore = fromMocks ?? fromPractice
  const scoreIsEstimate = fromMocks == null

  const weakEra = weakestKeys(mastery.eras, 2).map((e) => ERA_LABELS[e])
  const weakType = weakestKeys(mastery.types, 1).map((t) => labelType(t))
  const weakAreas = [...weakEra, ...weakType].slice(0, 3)

  const cardMin = Math.max(8, dueCards.length * 1.2)
  const conceptMin = lesson.estimatedMinutes
  const quizMin = settings.dailyQuestionCount * 2.2
  const estimatedMinutes = Math.round(cardMin + conceptMin + quizMin)

  const parts = [
    studyDay?.conceptDone ? 1 : 0,
    studyDay ? Math.min(1, studyDay.cardsReviewed / Math.max(1, settings.dailyCardCount)) : 0,
    studyDay
      ? Math.min(1, studyDay.questionsAnswered / Math.max(1, settings.dailyQuestionCount))
      : 0,
  ]
  const completionRate = Math.round((parts.reduce((a, b) => a + b, 0) / 3) * 100)

  return {
    date: today,
    lesson,
    dueCards,
    reviewCardCount: dueCards.length,
    questionCount: settings.dailyQuestionCount,
    estimatedMinutes,
    estimatedScore,
    scoreIsEstimate,
    goalScore: settings.goalScore,
    remainingToGoal: Math.max(0, settings.goalScore - estimatedScore),
    weakAreas,
    streak: meta?.streak ?? 0,
    week,
    planWeeks: settings.planWeeks,
    completionRate,
    focusLine: `오늘은 ${lesson.title} — ${weakAreas[0] ?? '기초'}를 차분히 구분해봅시다.`,
    summaryLine: `복습 카드 ${dueCards.length}장 · 개념 1개 · 맞춤 문제 ${settings.dailyQuestionCount}개`,
    timeLine: `예상 소요 시간 ${formatDuration(estimatedMinutes)}`,
    todayDone: Boolean(studyDay?.completed),
  }
}

export async function startOrResumeSession(today = toDateKey()): Promise<ActiveSession> {
  const existing = await db.activeSession.toCollection().first()
  if (existing && existing.date === today && existing.step !== 'result') {
    return existing
  }

  const plan = await buildTodayPlan(today)
  const settings = await getSettings()
  const mastery = await getMastery()
  const wrong = await db.wrongAnswers.orderBy('createdAt').reverse().limit(40).toArray()
  const recentWrongIds = wrong.map((w) => w.questionId)
  const dueReviewQuestionIds = recentWrongIds

  const selected = selectDailyQuestions({
    questions,
    masteryEras: mastery.eras,
    masteryTypes: mastery.types,
    recentWrongIds,
    dueReviewQuestionIds,
    todayLessonEra: plan.lesson.era,
    todayLessonId: plan.lesson.id,
    count: settings.dailyQuestionCount,
    boostTypes: settings.focusTypes,
  })

  const session: ActiveSession = {
    id: `session-${today}`,
    date: today,
    step: plan.dueCards.length > 0 ? 'cards' : 'concept',
    lessonId: plan.lesson.id,
    cardIds: plan.dueCards.map((c) => c.id),
    cardIndex: 0,
    conceptDone: false,
    conceptMemo: '',
    questionIds: selected.map((q) => q.id),
    questionIndex: 0,
    quizPhase: 'stem',
    clueMemo: '',
    revealedChoices: false,
    answered: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await db.activeSession.clear()
  await db.activeSession.put(session)
  return session
}

export async function saveSession(session: ActiveSession): Promise<void> {
  session.updatedAt = new Date().toISOString()
  await db.activeSession.put(session)
}

export async function rateCard(
  cardId: string,
  rating: CardRating,
  today = toDateKey(),
): Promise<FlashcardRecord> {
  const card = await db.cards.get(cardId)
  if (!card) throw new Error('카드를 찾을 수 없습니다.')
  const next = calculateNextInterval(rating, {
    intervalDays: card.intervalDays,
    easeStreak: card.easeStreak,
  })
  const updated: FlashcardRecord = {
    ...card,
    lastRating: rating,
    intervalDays: next.nextIntervalDays,
    easeStreak: next.easeStreak,
    nextReviewAt: addDays(today, next.nextIntervalDays),
    updatedAt: today,
    lapses: rating === 'again' ? card.lapses + 1 : card.lapses,
  }
  await db.cards.put(updated)
  return updated
}

export async function addCardFromContent(input: {
  front: string
  back: string
  kind: FlashcardRecord['kind']
  era: EraId
  tags: QuestionType[]
  fromWrongAnswer?: boolean
}): Promise<{ card: FlashcardRecord; created: boolean }> {
  const fingerprint = cardFingerprint(input.front, input.back)
  const existing = await db.cards.where('fingerprint').equals(fingerprint).first()
  if (existing) return { card: existing, created: false }

  const today = toDateKey()
  const card: FlashcardRecord = {
    id: `card-user-${Date.now()}`,
    front: input.front.trim(),
    back: input.back.trim(),
    kind: input.kind,
    era: input.era,
    tags: input.tags,
    fromWrongAnswer: input.fromWrongAnswer ?? false,
    createdAt: today,
    updatedAt: today,
    nextReviewAt: today,
    intervalDays: 0,
    easeStreak: 0,
    lapses: 0,
    fingerprint,
  }
  await db.cards.put(card)
  return { card, created: true }
}

export async function recordQuizAnswer(params: {
  question: Question
  selectedIndex: number
  correct: boolean
  responseMs: number
  cause?: WrongCause
  source: 'practice' | 'mock'
}): Promise<void> {
  const today = toDateKey()
  const attempt: AttemptRecord = {
    id: `att-${Date.now()}-${params.question.id}`,
    questionId: params.question.id,
    correct: params.correct,
    selectedIndex: params.selectedIndex,
    responseMs: params.responseMs,
    cause: params.cause,
    era: params.question.era,
    tags: params.question.tags,
    createdAt: new Date().toISOString(),
    source: params.source,
  }
  await db.attempts.put(attempt)

  if (!params.correct && params.cause) {
    const wrong: WrongAnswerRecord = {
      id: `wrong-${Date.now()}-${params.question.id}`,
      questionId: params.question.id,
      selectedIndex: params.selectedIndex,
      correctIndex: params.question.answerIndex,
      cause: params.cause,
      createdAt: today,
      stem: params.question.stem,
      explanation: params.question.explanation,
      era: params.question.era,
      tags: params.question.tags,
    }
    await db.wrongAnswers.put(wrong)
  }

  const mastery = await getMastery()
  const eraScore = mastery.eras[params.question.era] ?? 22
  mastery.eras[params.question.era] = updateMasteryScore({
    current: eraScore,
    correct: params.correct,
    responseMs: params.responseMs,
    daysAgo: 0,
    cause: params.cause,
  })
  for (const tag of params.question.tags) {
    mastery.types[tag] = updateMasteryScore({
      current: mastery.types[tag] ?? 22,
      correct: params.correct,
      responseMs: params.responseMs,
      daysAgo: 0,
      cause: params.cause,
    })
  }
  await db.mastery.put({ id: 'mastery', ...mastery })
}

export async function finishSession(session: ActiveSession): Promise<void> {
  const today = session.date
  const correctCount = session.answered.filter((a) => a.correct).length
  const day: StudyDayRecord = {
    date: today,
    completed: true,
    cardsReviewed: session.cardIds.length,
    conceptDone: session.conceptDone,
    questionsAnswered: session.answered.length,
    correctCount,
    lessonId: session.lessonId,
    minutesSpent: Math.max(
      10,
      Math.round(
        (Date.now() - new Date(session.startedAt).getTime()) / 60000,
      ),
    ),
  }
  await db.studyDays.put(day)

  const meta = await db.meta.get('meta')
  if (meta) {
    const yesterday = addDays(today, -1)
    const streak =
      meta.lastStudyDate === today
        ? meta.streak
        : meta.lastStudyDate === yesterday
          ? meta.streak + 1
          : 1
    const attempts = await db.attempts.orderBy('createdAt').reverse().limit(40).toArray()
    const mocks = await db.mockResults.orderBy('createdAt').reverse().limit(3).toArray()
    const estimated =
      estimateScoreFromMocks(mocks.map((m) => m.score)) ??
      estimateScoreFromAccuracy(
        attempts.filter((a) => a.correct).length,
        attempts.length,
      )
    await db.meta.put({
      ...meta,
      streak,
      lastStudyDate: today,
      estimatedScore: estimated,
    })
  }

  await db.activeSession.put({ ...session, step: 'result', updatedAt: new Date().toISOString() })
}

export async function saveMockResult(result: MockExamResult): Promise<void> {
  await db.mockResults.put(result)
  for (const ans of result.answers) {
    if (ans.selectedIndex == null) continue
    const q = questions.find((item) => item.id === ans.questionId)
    if (!q) continue
    await recordQuizAnswer({
      question: q,
      selectedIndex: ans.selectedIndex,
      correct: ans.correct,
      responseMs: 20_000,
      source: 'mock',
      cause: ans.correct ? undefined : 'missed-clue',
    })
  }
  const mocks = await db.mockResults.orderBy('createdAt').reverse().limit(3).toArray()
  const estimated = estimateScoreFromMocks(mocks.map((m) => m.score))
  const meta = await db.meta.get('meta')
  if (meta && estimated != null) {
    await db.meta.put({ ...meta, estimatedScore: estimated })
  }
}

export async function getProgressSnapshot() {
  const [mastery, attempts, mocks, studyDays, settings] = await Promise.all([
    getMastery(),
    db.attempts.toArray(),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
    db.studyDays.orderBy('date').reverse().limit(14).toArray(),
    getSettings(),
  ])
  const today = toDateKey()
  const last7 = attempts.filter((a) => daysBetween(a.createdAt.slice(0, 10), today) <= 7)
  const accuracy7 =
    last7.length === 0 ? 0 : Math.round((last7.filter((a) => a.correct).length / last7.length) * 100)

  const causeCounts: Record<string, number> = {}
  for (const a of attempts) {
    if (!a.cause) continue
    causeCounts[a.cause] = (causeCounts[a.cause] ?? 0) + 1
  }
  const topCause = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const mockScores = mocks.map((m) => m.score)
  const estimated =
    estimateScoreFromMocks(mockScores) ??
    estimateScoreFromAccuracy(
      attempts.filter((a) => a.correct).length,
      attempts.length,
    )
  const stable = isStableZone(mockScores, settings.goalScore, 3)
  const streak85 = consecutiveAboveThreshold(mockScores, settings.goalScore)
  const weak = [
    ...weakestKeys(mastery.eras, 2).map((e) => ERA_LABELS[e]),
    ...weakestKeys(mastery.types, 1).map((t) => labelType(t)),
  ].slice(0, 3)

  return {
    mastery,
    accuracy7,
    topCause,
    estimated,
    scoreIsEstimate: mockScores.length === 0,
    stable,
    streak85,
    mockScores: mockScores.slice(0, 5),
    recentStudy: studyDays,
    weak,
    advice: buildAdvice(weak, topCause, estimated, settings.goalScore),
  }
}

function buildAdvice(
  weak: string[],
  topCause: string | undefined,
  estimated: number,
  goal: number,
): string {
  const gap = Math.max(0, goal - estimated)
  const causeHint =
    topCause === 'confused-person'
      ? '왕·인물 카드를 왕→업적 / 업적→왕 양방향으로 반복하세요.'
      : topCause === 'confused-order'
        ? '사건 순서 카드를 소리 내어 배열해 보세요.'
        : topCause === 'missed-clue'
          ? '사료를 읽은 뒤 핵심 단서 한 줄을 먼저 적고 선택지를 보세요.'
          : '오늘은 취약 영역 개념을 짧게 읽고 문제를 풀어요.'
  return `예상 점수까지 ${gap}점. 우선 ${weak[0] ?? '기초'}에 집중하세요. ${causeHint}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

function labelType(t: QuestionType): string {
  const map: Record<QuestionType, string> = {
    'king-figure': '왕·인물',
    chronology: '연도·사건 순서',
    source: '사료',
    'cultural-heritage': '문화재',
    'independence-org': '독립운동 단체',
    'political-system': '정치 제도',
  }
  return map[t]
}

export function sessionAnswerStats(answered: SessionAnswer[]) {
  const correct = answered.filter((a) => a.correct).length
  return {
    total: answered.length,
    correct,
    accuracy: answered.length ? Math.round((correct / answered.length) * 100) : 0,
  }
}

export { ALL_ERAS, ALL_TYPES, questions, lessons }
