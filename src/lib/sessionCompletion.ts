import type { ActiveSession, AppMeta, StudyDayRecord } from '../types'
import { addDays } from './dates'
import type { SessionStudyMode } from '../types/dailyLearning'

export interface CompletionResult {
  day: StudyDayRecord
  meta: AppMeta
  session: ActiveSession
}

export function applySessionCompletion(input: {
  session: ActiveSession
  existingDay?: StudyDayRecord
  meta: AppMeta
  mode: SessionStudyMode
  nowIso: string
}): CompletionResult {
  const session = input.session
  const today = session.date
  const correctCount = session.answered.filter((answer) => answer.correct).length
  const minutesSpent = Math.max(
    1,
    Math.round((new Date(input.nowIso).getTime() - new Date(session.startedAt).getTime()) / 60_000),
  )

  const existing = input.existingDay
  if (input.mode === 'short-review') {
    const alreadyFull = Boolean(existing?.completed)
    const day: StudyDayRecord = {
      date: today,
      completed: alreadyFull,
      cardsReviewed: Math.max(existing?.cardsReviewed ?? 0, session.cardIds.length),
      conceptDone: existing?.conceptDone ?? false,
      questionsAnswered: Math.max(existing?.questionsAnswered ?? 0, session.answered.length),
      correctCount: Math.max(existing?.correctCount ?? 0, correctCount),
      lessonId: existing?.lessonId ?? session.lessonId,
      minutesSpent: (existing?.minutesSpent ?? 0) + (existing?.shortReviewSessionId === session.id ? 0 : minutesSpent),
      plan: existing?.plan,
      shortReviewCompleted: true,
      completedSessionId: existing?.completedSessionId,
      shortReviewSessionId: session.id,
    }
    return {
      day,
      meta: input.meta,
      session: { ...session, step: 'result', mode: 'short-review', updatedAt: input.nowIso },
    }
  }

  if (existing?.completed && existing.completedSessionId === session.id) {
    return {
      day: existing,
      meta: input.meta,
      session: { ...session, step: 'result', mode: 'full', updatedAt: input.nowIso },
    }
  }

  const day: StudyDayRecord = {
    date: today,
    completed: true,
    cardsReviewed: session.cardIds.length,
    conceptDone: session.conceptDone,
    questionsAnswered: session.answered.length,
    correctCount,
    lessonId: session.lessonId,
    minutesSpent,
    plan: existing?.plan,
    shortReviewCompleted: existing?.shortReviewCompleted ?? false,
    completedSessionId: session.id,
    shortReviewSessionId: existing?.shortReviewSessionId,
  }

  const yesterday = addDays(today, -1)
  const streak =
    input.meta.lastStudyDate === today
      ? input.meta.streak
      : input.meta.lastStudyDate === yesterday
        ? input.meta.streak + 1
        : 1

  return {
    day,
    meta: {
      ...input.meta,
      streak,
      lastStudyDate: today,
    },
    session: { ...session, step: 'result', mode: 'full', updatedAt: input.nowIso },
  }
}

export function emptyStudyDay(date: string, plan: StudyDayRecord['plan']): StudyDayRecord {
  return {
    date,
    completed: false,
    cardsReviewed: 0,
    conceptDone: false,
    questionsAnswered: 0,
    correctCount: 0,
    minutesSpent: 0,
    plan,
    shortReviewCompleted: false,
  }
}
