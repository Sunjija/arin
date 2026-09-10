import { lessons } from '../data/lessons'
import { questions } from '../data/questions'
import { TOPIC_CATALOG } from '../data/topicCatalog'
import { db } from '../db/database'
import type { ActiveSession, FlashcardRecord, StudyDayRecord, UserSettings } from '../types'
import type { FrozenDailyPlan, SessionStudyMode, TodayView } from '../types/dailyLearning'
import { nowIso, todayKey } from './clock'
import { deriveConceptProgress } from './conceptProgress'
import { buildTodayCopy } from './dailyLearningCopy'
import {
  flattenPlanCardsForMode,
  flattenPlanQuestions,
  primaryLessonId,
  reuseOrBuildDailyPlan,
} from './dailyLearningPlan'
import { DAILY_LEARNING_POLICY } from './dailyLearningPolicy'
import { currentMixGuidance } from './officialAnalysisAdapter'
import { classifyBank } from './questionQualityAdapter'
import { emptyStudyDay } from './sessionCompletion'
import { normalizeSettings } from './settingsNormalize'
import { normalizeResumedSession } from './sessionNormalize'

export async function readSettings(): Promise<UserSettings> {
  const row = await db.settings.get('settings')
  if (!row) throw new Error('설정이 없습니다.')
  const { id: _id, ...settings } = row
  return normalizeSettings(settings)
}

export async function writeSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ id: 'settings', ...normalizeSettings(settings) })
}

export async function getOrCreateDailyPlan(today = todayKey()): Promise<FrozenDailyPlan> {
  const [settings, cards, attempts, studyDays, session] = await Promise.all([
    readSettings(),
    db.cards.toArray(),
    db.attempts.toArray(),
    db.studyDays.toArray(),
    db.activeSession.get(sessionIdFor(today, 'full')),
  ])
  const existingDay = studyDays.find((day) => day.date === today)
  const mix = currentMixGuidance()
  const plan = reuseOrBuildDailyPlan({
    today,
    nowIso: nowIso(),
    settings,
    lessons,
    topics: TOPIC_CATALOG,
    cards,
    questions,
    attempts,
    studyDays,
    existingPlan: existingDay?.plan ?? null,
    existingSession: session ?? null,
    questionClasses: classifyBank(questions),
    actualMinuteSamples: studyDays.filter((day) => day.completed && day.minutesSpent > 0).map((day) => day.minutesSpent),
    mixBasis: mix.basis,
  })

  const day = existingDay
    ? { ...existingDay, plan }
    : emptyStudyDay(today, plan)
  await db.studyDays.put({ ...day, plan })
  return plan
}

export function sessionIdFor(today: string, mode: SessionStudyMode): string {
  return mode === 'short-review' ? `session-${today}-short` : `session-${today}`
}

export async function getTodayView(today = todayKey()): Promise<TodayView> {
  const [settings, plan, fullSession, , cards, attempts, studyDays] = await Promise.all([
    readSettings(),
    getOrCreateDailyPlan(today),
    db.activeSession.get(sessionIdFor(today, 'full')),
    db.activeSession.get(sessionIdFor(today, 'short-review')),
    db.cards.toArray(),
    db.attempts.toArray(),
    db.studyDays.toArray(),
  ])
  const day = studyDays.find((item) => item.date === today)
  const sessionInProgress = Boolean(fullSession && fullSession.step !== 'result')
  const todayFullDone = Boolean(day?.completed)
  const todayShortDone = Boolean(day?.shortReviewCompleted)
  const demoContent = cards.length > 0 && cards.every((card) => card.id.startsWith('c-'))
  const completedLessonIds = studyDays.filter((item) => item.conceptDone && item.lessonId).map((item) => item.lessonId!)
  const progress = deriveConceptProgress({
    questions,
    attempts,
    cards,
    topics: TOPIC_CATALOG,
    completedLessonIds,
  })
  const futureReviews = cards
    .map((card) => card.nextReviewAt)
    .filter((date) => date > today)
    .sort()
  const copy = buildTodayCopy({
    plan,
    onboardingCompleted: Boolean(settings.onboardingCompleted),
    sessionInProgress,
    todayFullDone,
    todayShortDone,
    demoContent,
    earliestFutureReview: futureReviews[0] ?? null,
    today,
    hasApplied: progress.some((item) => item.memory === 'applied'),
  })

  return {
    date: today,
    onboardingCompleted: Boolean(settings.onboardingCompleted),
    plan,
    demoContent,
    sessionInProgress,
    todayFullDone,
    todayShortDone,
    ...copy,
    shortReviewAvailable: copy.shortReviewAvailable && !todayShortDone,
  }
}

export async function startOrResumeStudySession(
  today = todayKey(),
  mode: SessionStudyMode = 'full',
): Promise<ActiveSession> {
  const id = sessionIdFor(today, mode)
  const existing = await db.activeSession.get(id)
  if (existing && existing.date === today && existing.step !== 'result') {
    const normalized = normalizeResumedSession(existing)
    if (normalized !== existing) await db.activeSession.put(normalized)
    return normalized
  }

  if (mode === 'short-review') {
    const full = await db.activeSession.get(sessionIdFor(today, 'full'))
    if (full && full.date === today && full.step !== 'result') {
      return full
    }
  }

  const plan = await getOrCreateDailyPlan(today)
  const cardIds = flattenPlanCardsForMode(plan, mode)
  const questionIds =
    mode === 'short-review'
      ? flattenPlanQuestions(plan, 'short-review').slice(0, DAILY_LEARNING_POLICY.shortReviewMaxQuestions)
      : flattenPlanQuestions(plan, 'full')
  const lessonId = primaryLessonId(plan, lessons)
  const session: ActiveSession = {
    id,
    date: today,
    step: cardIds.length > 0 ? 'cards' : mode === 'short-review' ? (questionIds.length > 0 ? 'quiz' : 'result') : 'concept',
    lessonId,
    cardIds,
    cardIndex: 0,
    conceptDone: mode === 'short-review',
    conceptMemo: '',
    questionIds,
    questionIndex: 0,
    quizPhase: 'choices',
    clueMemo: '',
    revealedChoices: true,
    answered: [],
    startedAt: nowIso(),
    updatedAt: nowIso(),
    mode,
    planDate: today,
    saveError: null,
  }
  await db.activeSession.put(session)
  return session
}

export async function saveStudySession(session: ActiveSession): Promise<void> {
  const next = { ...session, updatedAt: nowIso(), saveError: null }
  await db.activeSession.put(next)
}

export async function markStudySessionSaveError(session: ActiveSession, message: string): Promise<ActiveSession> {
  const next = { ...session, saveError: message, updatedAt: nowIso() }
  try {
    await db.activeSession.put(next)
  } catch {
    // keep memory copy even if IndexedDB failed twice
  }
  return next
}

export async function loadCardsByIds(ids: string[]): Promise<FlashcardRecord[]> {
  const rows = await db.cards.bulkGet(ids)
  return rows.filter((row): row is FlashcardRecord => Boolean(row))
}

export async function readStudyDay(date: string): Promise<StudyDayRecord | undefined> {
  return db.studyDays.get(date)
}

export { DAILY_LEARNING_POLICY }
