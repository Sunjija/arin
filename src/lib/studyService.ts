import { lessons } from '../data/lessons'
import { questions } from '../data/questions'
import { cardFingerprint } from './cardFingerprint'
import { addDays, daysBetween, isDue, planWeekNumber, toDateKey } from './dates'
import { observedWeakAreas, updateMasteryScore } from './mastery'
import { selectDailyQuestions } from './questionSelection'
import {
  buildScoreSummary,
  estimatedScoreFromRecords,
  isConsecutiveGoalStable,
} from './scoreSummary'
import { calculateNextInterval } from './spacedRepetition'
import { MAX_DAILY_CARDS, normalizeDailyCardCount } from './studyLimits'
import { pickDueCardsForToday, planDailyQuantity, quantitySettingsCopy } from './studyPlan'
import { selectScheduledLesson, upsertLessonCompletion } from './lessonProgress'
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
  StudyEntryMode,
  UserSettings,
  WrongAnswerRecord,
  WrongCause,
} from '../types'
import { ALL_ERAS, ALL_TYPES } from '../types'
import type { ProgressSnapshot, StartStudyInput, TodayPlan } from '../types/contracts'

export type { TodayPlan, ProgressSnapshot }

export function normalizeResumedSession(session: ActiveSession): ActiveSession {
  let normalized = session

  if (session.step === 'cards' && session.cardIds.length > MAX_DAILY_CARDS) {
    const remainingCardIds = session.cardIds.slice(
      session.cardIndex,
      session.cardIndex + MAX_DAILY_CARDS,
    )
    normalized = {
      ...normalized,
      step: remainingCardIds.length > 0 ? 'cards' : nextStepAfterCards(session),
      cardIds: remainingCardIds,
      cardIndex: 0,
    }
  }

  if (
    normalized.step === 'quiz' &&
    (normalized.quizPhase === 'stem' ||
      normalized.quizPhase === 'era' ||
      normalized.quizPhase === 'clue')
  ) {
    normalized = {
      ...normalized,
      quizPhase: 'choices',
      revealedChoices: true,
    }
  }

  if (normalized !== session) {
    normalized.updatedAt = new Date().toISOString()
  }
  return normalized
}

function nextStepAfterCards(session: ActiveSession): ActiveSession['step'] {
  return session.entryMode === 'review' ? 'result' : 'concept'
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

export async function getScoreSummary() {
  const [settings, attempts, mocks] = await Promise.all([
    getSettings(),
    db.attempts.toArray(),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
  ])
  return buildScoreSummary({
    attempts,
    mockResultsNewestFirst: mocks,
    goalScore: settings.goalScore,
  })
}

export async function buildTodayPlan(today = toDateKey()): Promise<TodayPlan> {
  const [settings, cards, meta, studyDay, mocks, attempts, active] = await Promise.all([
    getSettings(),
    db.cards.toArray(),
    db.meta.get('meta'),
    db.studyDays.get(today),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
    db.attempts.toArray(),
    db.activeSession.toCollection().first(),
  ])

  const week = planWeekNumber(settings.startDate, today, settings.planWeeks)
  const resumeLessonId =
    active && active.date === today && active.step !== 'result' ? active.lessonId : undefined
  const lesson = selectScheduledLesson(lessons, {
    startDate: settings.startDate,
    today,
    planWeeks: settings.planWeeks,
    activeLessonId: resumeLessonId,
  }).lesson

  const dailyCardCount = normalizeDailyCardCount(settings.dailyCardCount)
  const dueAll = cards.filter((c) => isDue(c.nextReviewAt, today))
  const quantity = planDailyQuantity({
    dailyMinutes: settings.dailyMinutes,
    dailyQuestionCap: settings.dailyQuestionCount,
    dailyCardCap: dailyCardCount,
    dueCardCount: dueAll.length,
    lesson,
  })
  const dueCards = pickDueCardsForToday(dueAll, lesson.era, quantity.selectedCardCount)

  const scoreSummary = buildScoreSummary({
    attempts,
    mockResultsNewestFirst: mocks,
    goalScore: settings.goalScore,
  })
  const weakAreas = observedWeakAreas(attempts)
  const reviewHasEvidence = weakAreas.length > 0
  const reviewLabel = reviewHasEvidence ? (weakAreas[0]?.label ?? '기초 복습') : '기초 복습'
  const estimatedScore = estimatedScoreFromRecords({
    attempts,
    mockResultsNewestFirst: mocks,
  })

  const completionRate = studyDay
    ? Math.round(
        ((studyDay.conceptDone ? 1 : 0) +
          Math.min(1, studyDay.cardsReviewed / Math.max(1, quantity.selectedCardCount || 1)) +
          Math.min(1, studyDay.questionsAnswered / Math.max(1, quantity.selectedQuestionCount))) /
          3 *
          100,
      )
    : 0

  return {
    date: today,
    week,
    planWeeks: settings.planWeeks,
    lesson,
    reviewLabel,
    reviewHasEvidence,
    dueCards,
    quantity,
    reviewCardCount: dueCards.length,
    questionCount: quantity.selectedQuestionCount,
    estimatedMinutes: quantity.estimatedMinutes,
    completion: {
      todayDone: Boolean(studyDay?.completed),
      cardsReviewed: studyDay?.cardsReviewed ?? 0,
      questionsAnswered: studyDay?.questionsAnswered ?? 0,
      conceptDone: Boolean(studyDay?.conceptDone),
      extraReviewAvailable: Boolean(studyDay?.completed),
    },
    scoreSummary,
    observedWeakAreas: weakAreas,
    weakAreas: weakAreas.map((area) => area.label),
    streak: meta?.streak ?? 0,
    estimatedScore,
    scoreIsEstimate: scoreSummary.fullMockAverage == null,
    goalScore: settings.goalScore,
    remainingToGoal:
      estimatedScore == null ? null : Math.max(0, settings.goalScore - estimatedScore),
    focusLine: `오늘 학습: ${lesson.title}`,
    timeLine: quantity.fitsDailyMinutes
      ? `약 ${quantity.estimatedMinutes}분`
      : quantity.guidance ?? `약 ${quantity.estimatedMinutes}분`,
    todayDone: Boolean(studyDay?.completed),
    completionRate,
  }
}

export async function startOrResumeSession(
  todayOrInput: string | StartStudyInput = toDateKey(),
): Promise<ActiveSession> {
  const input: StartStudyInput =
    typeof todayOrInput === 'string' ? { today: todayOrInput } : todayOrInput
  const today = input.today ?? toDateKey()
  const entryMode: StudyEntryMode = input.entryMode ?? 'daily'

  const existing = await db.activeSession.toCollection().first()
  if (existing && existing.date === today && existing.step !== 'result') {
    const normalized = normalizeResumedSession(existing)
    if (normalized !== existing) {
      await db.activeSession.put(normalized)
    }
    return normalized
  }

  const plan = await buildTodayPlan(today)
  const settings = await getSettings()
  const mastery = await getMastery()
  const wrong = await db.wrongAnswers.orderBy('createdAt').reverse().limit(40).toArray()
  const recentWrongIds = wrong.map((w) => w.questionId)

  const selected =
    entryMode === 'review'
      ? []
      : selectDailyQuestions({
          questions,
          masteryEras: mastery.eras,
          masteryTypes: mastery.types,
          recentWrongIds,
          dueReviewQuestionIds: recentWrongIds,
          todayLessonEra: plan.lesson.era,
          todayLessonId: plan.lesson.id,
          count: plan.questionCount,
          boostTypes: settings.focusTypes,
        })

  const session: ActiveSession = {
    id: `session-${today}-${Date.now()}`,
    date: today,
    step: plan.dueCards.length > 0 ? 'cards' : entryMode === 'review' ? 'result' : 'concept',
    lessonId: plan.lesson.id,
    cardIds: plan.dueCards.map((c) => c.id),
    cardIndex: 0,
    conceptDone: false,
    conceptMemo: '',
    questionIds: selected.map((q) => q.id),
    questionIndex: 0,
    quizPhase: 'choices',
    clueMemo: '',
    revealedChoices: true,
    answered: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entryMode,
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
    userEdited: true,
  }
  await db.cards.put(card)
  return { card, created: true }
}

export async function recordQuizAnswer(params: {
  question: Question
  selectedIndex: number
  correct: boolean
  responseMs: number | null
  cause?: WrongCause
  source: 'practice' | 'mock'
  resultId?: string
  attemptId?: string
}): Promise<AttemptRecord> {
  const today = toDateKey()
  const attemptId = params.attemptId ?? `att-${Date.now()}-${params.question.id}`
  if (params.attemptId) {
    const existing = await db.attempts.get(params.attemptId)
    if (existing) return existing
  }

  const attempt: AttemptRecord = {
    id: attemptId,
    questionId: params.question.id,
    correct: params.correct,
    selectedIndex: params.selectedIndex,
    responseMs: params.responseMs,
    responseMsSource: params.responseMs == null ? 'unavailable' : 'measured',
    cause: params.correct ? undefined : (params.cause ?? 'unknown'),
    era: params.question.era,
    tags: params.question.tags,
    createdAt: new Date().toISOString(),
    source: params.source,
    resultId: params.resultId,
  }
  await db.attempts.put(attempt)

  if (!params.correct) {
    const wrong: WrongAnswerRecord = {
      id: `wrong-${attempt.id}`,
      questionId: params.question.id,
      selectedIndex: params.selectedIndex,
      correctIndex: params.question.answerIndex,
      cause: attempt.cause ?? 'unknown',
      createdAt: today,
      stem: params.question.stem,
      explanation: params.question.explanation,
      era: params.question.era,
      tags: params.question.tags,
    }
    await db.wrongAnswers.put(wrong)
  }

  const mastery = await getMastery()
  const eraScore = mastery.eras[params.question.era] ?? 50
  mastery.eras[params.question.era] = updateMasteryScore({
    current: eraScore,
    correct: params.correct,
    responseMs: params.responseMs,
    daysAgo: 0,
    cause: attempt.cause,
  })
  for (const tag of params.question.tags) {
    mastery.types[tag] = updateMasteryScore({
      current: mastery.types[tag] ?? 50,
      correct: params.correct,
      responseMs: params.responseMs,
      daysAgo: 0,
      cause: attempt.cause,
    })
  }
  await db.mastery.put({ id: 'mastery', ...mastery })
  return attempt
}

export async function updateAttemptCause(
  attemptId: string,
  cause: WrongCause,
): Promise<AttemptRecord> {
  const attempt = await db.attempts.get(attemptId)
  if (!attempt) throw new Error('시도 기록을 찾을 수 없습니다.')
  const updated: AttemptRecord = { ...attempt, cause }
  await db.attempts.put(updated)
  const wrong = await db.wrongAnswers.get(`wrong-${attemptId}`)
  if (wrong) await db.wrongAnswers.put({ ...wrong, cause })
  return updated
}

export async function finishSession(session: ActiveSession): Promise<void> {
  const today = session.date
  const existingDay = await db.studyDays.get(today)
  if (existingDay?.finishedSessionIds?.includes(session.id)) {
    await db.activeSession.put({ ...session, step: 'result', updatedAt: new Date().toISOString() })
    return
  }

  const started = Date.parse(session.startedAt)
  const minutesMeasured = Number.isFinite(started)
  const minutesSpent = minutesMeasured
    ? Math.max(0, Math.round((Date.now() - started) / 60000))
    : 0
  const cardsReviewedCount =
    session.step === 'cards' ? session.cardIndex : session.cardIds.length

  const day: StudyDayRecord = {
    date: today,
    completed: true,
    cardsReviewed: (existingDay?.cardsReviewed ?? 0) + cardsReviewedCount,
    conceptDone: Boolean(existingDay?.conceptDone || session.conceptDone),
    questionsAnswered: (existingDay?.questionsAnswered ?? 0) + session.answered.length,
    correctCount: (existingDay?.correctCount ?? 0) + session.answered.filter((a) => a.correct).length,
    lessonId: existingDay?.lessonId ?? session.lessonId,
    minutesSpent: (existingDay?.minutesSpent ?? 0) + minutesSpent,
    minutesMeasured: Boolean(existingDay?.minutesMeasured || minutesMeasured),
    finishedSessionIds: [...(existingDay?.finishedSessionIds ?? []), session.id],
  }
  await db.studyDays.put(day)

  if (session.entryMode !== 'review') {
    const current = await db.lessonCompletions.get(session.lessonId)
    await db.lessonCompletions.put(upsertLessonCompletion(current, session.lessonId, today))
  }

  const meta = await db.meta.get('meta')
  if (meta) {
    const yesterday = addDays(today, -1)
    const streak =
      meta.lastStudyDate === today
        ? meta.streak
        : meta.lastStudyDate === yesterday
          ? meta.streak + 1
          : 1
    await db.meta.put({
      ...meta,
      streak,
      lastStudyDate: today,
    })
  }

  await db.activeSession.put({ ...session, step: 'result', updatedAt: new Date().toISOString() })
}

export async function saveMockResult(result: MockExamResult): Promise<MockExamResult> {
  const existing = await db.mockResults.get(result.id)
  if (existing) return existing

  await db.transaction('rw', [db.mockResults, db.attempts, db.wrongAnswers, db.mastery], async () => {
    const again = await db.mockResults.get(result.id)
    if (again) return
    await db.mockResults.put(result)

    for (const ans of result.answers) {
      if (ans.selectedIndex == null) continue
      const baseId = ans.questionId.split('__pad')[0]!
      const q = questions.find((item) => item.id === baseId || item.id === ans.questionId)
      if (!q) continue
      await recordQuizAnswer({
        question: q,
        selectedIndex: ans.selectedIndex,
        correct: ans.correct,
        responseMs: null,
        source: 'mock',
        cause: ans.correct ? undefined : 'unknown',
        resultId: result.id,
        attemptId: `att-${result.id}-${baseId}`,
      })
    }
  })

  const stored = await db.mockResults.get(result.id)
  if (!stored) throw new Error('모의고사 결과를 저장하지 못했습니다.')
  return stored
}

export async function getProgressSnapshot(): Promise<ProgressSnapshot> {
  const [mastery, attempts, mocks, studyDays, settings, completions] = await Promise.all([
    getMastery(),
    db.attempts.toArray(),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
    db.studyDays.orderBy('date').reverse().limit(14).toArray(),
    getSettings(),
    db.lessonCompletions.toArray(),
  ])
  const today = toDateKey()
  const last7 = attempts.filter((a) => daysBetween(a.createdAt.slice(0, 10), today) <= 7)
  const accuracy7 =
    last7.length === 0 ? null : Math.round((last7.filter((a) => a.correct).length / last7.length) * 100)

  const causeCounts: Partial<Record<WrongCause, number>> = {}
  for (const a of attempts) {
    if (!a.cause || a.cause === 'unknown') continue
    causeCounts[a.cause] = (causeCounts[a.cause] ?? 0) + 1
  }
  const topCause = (Object.entries(causeCounts) as Array<[WrongCause, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0]

  const scoreSummary = buildScoreSummary({
    attempts,
    mockResultsNewestFirst: mocks,
    goalScore: settings.goalScore,
  })
  const weakAreas = observedWeakAreas(attempts)
  const mockScores = mocks.map((m) => m.score)

  return {
    scoreSummary,
    weakAreas,
    recentStudy: studyDays,
    lessonCompletions: completions,
    masteryInternal: mastery,
    mastery,
    topCause,
    advice: buildAdvice(weakAreas.map((w) => w.label), topCause, scoreSummary, settings.goalScore),
    estimated: estimatedScoreFromRecords({
      attempts,
      mockResultsNewestFirst: mocks,
    }),
    scoreIsEstimate: scoreSummary.fullMockAverage == null,
    streak85: scoreSummary.consecutiveGoalHits,
    stable: isConsecutiveGoalStable(scoreSummary.consecutiveGoalHits),
    mockScores: mockScores.slice(0, 5),
    accuracy7,
    weak: weakAreas.slice(0, 3).map((w) => w.label),
  }
}

function buildAdvice(
  weak: string[],
  topCause: WrongCause | undefined,
  summary: TodayPlan['scoreSummary'],
  goal: number,
): string {
  if (summary.practiceAttemptCount === 0 && summary.eligibleFullMockCount === 0) {
    return '첫 학습 후 기록이 쌓여요. 오늘 학습을 시작하면 연습 정답률과 실전 연습 평균을 보여 드립니다.'
  }
  const causeHint =
    topCause === 'confused-person'
      ? '왕·인물 카드를 왕→업적 / 업적→왕 양방향으로 반복하세요.'
      : topCause === 'confused-order'
        ? '사건 순서 카드를 소리 내어 배열해 보세요.'
        : topCause === 'missed-clue'
          ? '사료를 읽은 뒤 핵심 단서 한 줄을 먼저 적고 선택지를 보세요.'
          : '오늘은 측정된 취약 영역이 있으면 그 개념을 짧게 읽고 문제를 풀어요.'
  const full =
    summary.fullMockAverage == null
      ? '최근 실전 연습 평균은 아직 없습니다.'
      : `최근 실전 연습 평균 ${summary.fullMockAverage}점(적격 ${Math.min(3, summary.eligibleFullMockCount)}회). 목표 ${goal}점.`
  const focus = weak[0] ? `우선 ${weak[0]}에 집중하세요.` : '측정된 취약 영역은 아직 없습니다.'
  return `${full} ${focus} ${causeHint}`
}

export function sessionAnswerStats(answered: SessionAnswer[]) {
  const correct = answered.filter((a) => a.correct).length
  return {
    total: answered.length,
    correct,
    accuracy: answered.length ? Math.round((correct / answered.length) * 100) : 0,
  }
}

export { ALL_ERAS, ALL_TYPES, questions, lessons, quantitySettingsCopy }
