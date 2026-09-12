import { lessons } from '../data/lessons'
import { COURSE_CONCEPT_IDS } from '../data/courseOrder'
import { questions } from '../data/questions'
import { cardFingerprint } from './cardFingerprint'
import { addDays, daysBetween, planWeekNumber, toDateKey } from './dates'
import { observedWeakAreas } from './mastery'
import {
  buildScoreSummary,
  estimatedScoreFromRecords,
  isConsecutiveGoalStable,
} from './scoreSummary'
import { calculateNextInterval } from './spacedRepetition'
import { MAX_DAILY_CARDS } from './studyLimits'
import { quantitySettingsCopy } from './studyPlan'
import { db } from '../db/database'
import { questionFromSnapshot } from './examScoring'
import { requireCurrentSession, revisedSession, StudySessionConflictError } from './studySessionConcurrency'
import {
  completeSession,
  computeStudyPlan,
  getSettings as readLearningSettings,
  recordAnswer,
  startLesson,
} from './learningApi'
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
  StudyEntryMode,
  UserSettings,
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
  return readLearningSettings()
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
  const [settings, meta, studyDay, mocks, attempts] = await Promise.all([
    getSettings(),
    db.meta.get('meta'),
    db.studyDays.get(today),
    db.mockResults.orderBy('createdAt').reverse().toArray(),
    db.attempts.toArray(),
  ])
  const frozen = await computeStudyPlan(today)
  if (frozen.conceptSchedule) {
    const rows = await db.conceptProgress.toArray()
    const completed = rows.filter(row => row.learnState === 'completed' && COURSE_CONCEPT_IDS.includes(row.conceptId)).length
    const remaining = frozen.conceptSchedule.totalConcepts - completed
    frozen.conceptSchedule = { ...frozen.conceptSchedule, completedConcepts: completed, remainingConcepts: remaining, readyRemainingConcepts: Math.max(0, remaining - frozen.conceptSchedule.unavailableConcepts) }
  }
  const lesson = lessons.find((item) => item.id === frozen.currentLessonId) ?? lessons[0]!
  const dueCards = (await db.cards.bulkGet(frozen.reviewCardIds)).filter(
    (card): card is FlashcardRecord => Boolean(card),
  )
  const week = planWeekNumber(settings.startDate, today, settings.planWeeks)
  const quantity = {
    dailyMinutes: settings.dailyMinutes,
    dailyQuestionCap: settings.dailyQuestionCount,
    dailyCardCap: settings.dailyCardCount,
    selectedCardCount: frozen.reviewCardCount,
    selectedQuestionCount: frozen.newQuestionCount + frozen.reviewQuestionCount,
    estimatedMinutes: Math.max(1, lesson.estimatedMinutes),
    fitsDailyMinutes: true,
    overflowMinutes: 0,
    estimateKind: 'heuristic' as const,
    newQuestionCount: frozen.newQuestionCount,
    reviewQuestionCount: frozen.reviewQuestionCount,
    guidance: frozen.reasons[0] ?? null,
  }
  const scoreSummary = buildScoreSummary({
    attempts,
    mockResultsNewestFirst: mocks,
    goalScore: settings.goalScore,
  })
  const weakAreas = observedWeakAreas(attempts)
  const reviewHasEvidence = frozen.reviewCardCount > 0 || frozen.reviewQuestionCount > 0
  const reviewLabel = reviewHasEvidence ? (weakAreas[0]?.label ?? '누적 복습') : '배운 범위 복습 대기'
  const estimatedScore = estimatedScoreFromRecords({
    attempts,
    mockResultsNewestFirst: mocks,
  })
  const questionCount = frozen.newQuestionCount + frozen.reviewQuestionCount
  const completionRate = studyDay?.completed ? 100 : studyDay
    ? Math.round(
        ((studyDay.conceptDone ? 1 : 0) +
          Math.min(1, studyDay.cardsReviewed / Math.max(1, frozen.reviewCardCount || 1)) +
          Math.min(1, studyDay.questionsAnswered / Math.max(1, questionCount || 1))) /
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
    reviewCardCount: frozen.reviewCardCount,
    questionCount,
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
    timeLine: `개념 ${frozen.newConceptCount}개 · 문제 ${frozen.newQuestionCount}개 · 복습 ${frozen.reviewCardCount}장`,
    todayDone: Boolean(studyDay?.completed),
    completionRate,
    conceptFinishDate: frozen.conceptFinishDate,
    examDateMode: frozen.examDateMode,
    planWarnings: frozen.warnings,
    newQuestionCount: frozen.newQuestionCount,
    reviewQuestionCount: frozen.reviewQuestionCount,
    frozenPlan: frozen,
  }
}

export async function startOrResumeSession(
  todayOrInput: string | StartStudyInput = toDateKey(),
): Promise<ActiveSession> {
  const input: StartStudyInput =
    typeof todayOrInput === 'string' ? { today: todayOrInput } : todayOrInput
  const today = input.today ?? toDateKey()
  const entryMode: StudyEntryMode = input.entryMode ?? 'daily'

  await startLesson({ today, entryMode, startNewReview: input.startNewReview })
  return db.transaction('rw', db.activeSession, async () => {
    const existing = await db.activeSession.toCollection().first()
    if (!existing) throw new StudySessionConflictError()
    const normalized = normalizeResumedSession(existing)
    if (normalized === existing) return existing
    const saved = revisedSession(normalized)
    await db.activeSession.put(saved)
    return saved
  })
}

export async function saveSession(session: ActiveSession): Promise<ActiveSession> {
  return db.transaction('rw', db.activeSession, async () => {
    await requireCurrentSession(session)
    if (session.step === 'result') throw new Error('학습 완료는 완료 저장 기능을 사용해 주세요.')
    const saved = revisedSession(session)
    await db.activeSession.put(saved)
    return saved
  })
}

export async function getSavedSession(): Promise<ActiveSession> {
  const session = await db.activeSession.toCollection().first()
  if (!session) throw new Error('저장된 학습 진행이 없습니다. 오늘 화면에서 다시 시작해 주세요.')
  return session
}

/** Answer, feedback position, wrong-answer log and mastery commit together. */
export async function submitSessionAnswer(session: ActiveSession, responseMs: number | null): Promise<ActiveSession> {
  return db.transaction('rw', [db.activeSession, db.attempts, db.wrongAnswers, db.mastery, db.conceptProgress], async () => {
    const current = await requireCurrentSession(session)
    const questionId = current.questionIds[current.questionIndex]
    if (current.step !== 'quiz' || current.selectedIndex == null || current.answered.some(answer => answer.questionId === questionId)) throw new StudySessionConflictError()
    const snapshot = current.questionSnapshots?.find(item => item.questionId === questionId)
    const question = snapshot ? questionFromSnapshot(snapshot) : questions.find(item => item.id === questionId)
    if (!question) throw new Error('저장된 문항을 찾을 수 없습니다.')
    const attempt = await recordAnswer({ question, snapshot, selectedIndex: current.selectedIndex, correct: current.selectedIndex === question.answerIndex,
      responseMs, cause: 'unknown', learningSource: current.entryMode === 'review' ? 'review' : 'today',
      attemptId: `att-${current.id}-q${current.questionIndex}-${question.id}` })
    // Old clients could write the attempt before failing to write feedback. Its
    // original snapshot remains authoritative even if bundled content changed.
    const questionSnapshots = [...(current.questionSnapshots ?? [])]
    if (attempt.snapshot) {
      const index = questionSnapshots.findIndex(item => item.questionId === question.id)
      if (index < 0) questionSnapshots.push(attempt.snapshot)
      else questionSnapshots[index] = attempt.snapshot
    }
    const saved = revisedSession({ ...current, quizPhase: 'feedback', selectedIndex: attempt.selectedIndex,
      questionSnapshots: questionSnapshots.length ? questionSnapshots : current.questionSnapshots,
      answered: [...current.answered, { questionId: question.id, correct: attempt.correct,
        selectedIndex: attempt.selectedIndex, cause: attempt.cause, responseMs: attempt.responseMs,
        eraGuess: current.eraGuess, clueMemo: current.clueMemo, attemptId: attempt.id }] })
    await db.activeSession.put(saved)
    return saved
  })
}

export async function saveSessionAnswerCause(session: ActiveSession, cause: WrongCause): Promise<ActiveSession> {
  return db.transaction('rw', [db.activeSession, db.attempts, db.wrongAnswers], async () => {
    const current = await requireCurrentSession(session)
    const answer = current.answered.find(item => item.questionId === current.questionIds[current.questionIndex])
    if (current.step !== 'quiz' || !answer?.attemptId || answer.correct) throw new StudySessionConflictError()
    await updateAttemptCause(answer.attemptId, cause)
    const saved = revisedSession({ ...current, answered: current.answered.map(item => item.attemptId === answer.attemptId ? { ...item, cause } : item) })
    await db.activeSession.put(saved)
    return saved
  })
}

/** A card occurrence is consumed only if its rating and next session position both save. */
export async function advanceSessionCard(session: ActiveSession, rating: CardRating, requeue: boolean): Promise<ActiveSession> {
  return db.transaction('rw', [db.activeSession, db.cards, db.studyDays, db.lessonCompletions, db.conceptProgress, db.meta], async () => {
    const current = await requireCurrentSession(session)
    const cardId = current.cardIds[current.cardIndex]
    if (current.step !== 'cards' || !cardId) throw new StudySessionConflictError()
    await rateCard(cardId, rating)
    const cardIds = [...current.cardIds]
    if (requeue && cardIds.length < MAX_DAILY_CARDS) cardIds.splice(Math.min(cardIds.length, current.cardIndex + 3), 0, cardId)
    const next: ActiveSession = { ...current, cardIds, cardIndex: current.cardIndex + 1 }
    if (next.cardIndex >= cardIds.length) {
      next.step = next.conceptDone && next.questionIndex < next.questionIds.length ? 'quiz'
        : next.entryMode === 'review' || next.conceptDone ? 'result' : 'concept'
    }
    return next.step === 'result' ? (await completeSession(next)).session : saveSession(next)
  })
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
  learningSource?: 'today' | 'review' | 'library' | 'mock' | 'practice'
  resultId?: string
  attemptId?: string
}): Promise<AttemptRecord> {
  return recordAnswer({
    question: params.question,
    selectedIndex: params.selectedIndex,
    correct: params.correct,
    responseMs: params.responseMs,
    cause: params.cause,
    learningSource: params.learningSource ?? (params.source === 'mock' ? 'mock' : 'practice'),
    resultId: params.resultId,
    attemptId: params.attemptId,
  })
}

export async function updateAttemptCause(
  attemptId: string,
  cause: WrongCause,
): Promise<AttemptRecord> {
  return db.transaction('rw', [db.attempts, db.wrongAnswers], async () => {
  const attempt = await db.attempts.get(attemptId)
  if (!attempt) throw new Error('시도 기록을 찾을 수 없습니다.')
  const updated: AttemptRecord = { ...attempt, cause }
  await db.attempts.put(updated)
  const wrong = await db.wrongAnswers.get(`wrong-${attemptId}`)
  if (wrong) await db.wrongAnswers.put({ ...wrong, cause })
  return updated
  })
}

export async function finishSession(session: ActiveSession): Promise<ActiveSession> {
  return (await completeSession(session)).session
}

export async function saveMockResult(result: MockExamResult): Promise<MockExamResult> {
  const existing = await db.mockResults.get(result.id)
  if (existing) return existing

  await db.transaction('rw', [db.mockResults, db.attempts, db.wrongAnswers, db.mastery, db.conceptProgress], async () => {
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
  const unique = [...new Map(answered.map(answer => [answer.questionId, answer])).values()]
  const correct = unique.filter((a) => a.correct).length
  return {
    total: unique.length,
    correct,
    accuracy: unique.length ? Math.round((correct / unique.length) * 100) : 0,
  }
}

export { ALL_ERAS, ALL_TYPES, questions, lessons, quantitySettingsCopy }
