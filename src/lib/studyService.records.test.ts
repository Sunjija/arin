import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import { flashcardSeeds } from '../data/cards'
import { lessons } from '../data/lessons'
import { addDays } from './dates'
import { CONTENT_VERSION, ensureSeeded, seedCards } from '../db/seed'
import {
  buildTodayPlan,
  finishSession,
  getProgressSnapshot,
  startOrResumeSession,
} from './studyService'
import { db } from '../db/database'
import { practiceAttempt, resetAppDb, seedCore } from '../test/idb'
import type { ActiveSession } from '../types'

afterEach(async () => {
  await resetAppDb()
})

describe('today plan lessons and estimated scores', () => {
  it('covers all 18 lessons in the default 8-week plan and keeps a resumed session', async () => {
    await resetAppDb()
    await seedCore({ startDate: '2026-01-05', planWeeks: 8 })
    const seen = new Set<string>()
    for (let day = 0; day < 56; day += 1) {
      const plan = await buildTodayPlan(addDays('2026-01-05', day))
      seen.add(plan.lesson.id)
    }
    expect(seen.size).toBe(18)
    expect(seen).toEqual(new Set(lessons.map((lesson) => lesson.id)))

    const session: ActiveSession = {
      id: 'session-2026-01-06',
      date: '2026-01-06',
      step: 'concept',
      lessonId: 'lesson-01',
      cardIds: [],
      cardIndex: 0,
      conceptDone: false,
      conceptMemo: '',
      questionIds: ['q-01'],
      questionIndex: 0,
      quizPhase: 'choices',
      clueMemo: '',
      revealedChoices: true,
      answered: [],
      startedAt: '2026-01-06T00:00:00.000Z',
      updatedAt: '2026-01-06T00:00:00.000Z',
      entryMode: 'daily',
    }
    await db.activeSession.put(session)
    const resumed = await buildTodayPlan('2026-01-06')
    expect(resumed.lesson.id).toBe('lesson-01')
  })

  it('keeps daily questions and cards in the lesson era, including an old mixed session', async () => {
    await resetAppDb()
    await seedCore({ dailyMinutes: 120 })
    await db.cards.bulkPut(flashcardSeeds.map((card) => ({ ...card, fingerprint: card.id, createdAt: '2026-01-05', updatedAt: '2026-01-05', nextReviewAt: '2026-01-05', intervalDays: 0, easeStreak: 0, lapses: 0 })))
    const session = await startOrResumeSession('2026-01-05')
    const era = lessons.find((lesson) => lesson.id === session.lessonId)!.era
    expect(session.questionIds.length).toBeGreaterThan(0)
    expect(session.questionIds.every((id) => questions.find((q) => q.id === id)?.era === era)).toBe(true)
    expect((await db.cards.bulkGet(session.cardIds)).every((card) => card?.era === era)).toBe(true)
    const foreign = questions.find((q) => q.era !== era)!
    await db.activeSession.put({ ...session, questionIds: [foreign.id, ...session.questionIds], selectedIndex: 3, step: 'quiz' })
    const resumed = await startOrResumeSession('2026-01-05')
    expect(resumed.questionIds.every((id) => questions.find((q) => q.id === id)?.era === era)).toBe(true)
    expect(resumed.selectedIndex).toBeUndefined()
    expect((await startOrResumeSession('2026-01-05')).questionIds).toEqual(resumed.questionIds)
    await db.activeSession.clear()
    const review = await startOrResumeSession({ today: '2026-01-05', entryMode: 'review' })
    expect((await db.cards.bulkGet(review.cardIds)).some((card) => card?.era !== era)).toBe(true)
  })

  it('uses the same estimated score on home and progress for the same records', async () => {
    await resetAppDb()
    await seedCore()
    const olderWrong = Array.from({ length: 40 }, (_, i) =>
      practiceAttempt(
        `old-${i}`,
        false,
        `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
      ),
    )
    const recentCorrect = Array.from({ length: 40 }, (_, i) =>
      practiceAttempt(
        `new-${i}`,
        true,
        `2026-02-01T00:00:${String(i).padStart(2, '0')}.000Z`,
      ),
    )
    await db.attempts.bulkPut([...olderWrong, ...recentCorrect])

    const home = await buildTodayPlan('2026-02-02')
    const progress = await getProgressSnapshot()
    expect(home.estimatedScore).toBe(100)
    expect(progress.estimated).toBe(100)
    expect(home.estimatedScore).toBe(progress.estimated)
    expect(home.scoreSummary).toEqual(progress.scoreSummary)
    expect(home.scoreSummary.practiceAccuracy).toBe(50)
  })

  it('does not mark the daily lesson complete after a review-only card session', async () => {
    await resetAppDb()
    await seedCore()
    await db.cards.bulkPut(seedCards('2026-01-05'))

    const review = await startOrResumeSession({ today: '2026-01-05', entryMode: 'review' })
    expect(review.cardIds.length).toBeGreaterThan(0)
    await finishSession({
      ...review,
      step: 'result',
      cardIndex: review.cardIds.length,
    })

    const day = await db.studyDays.get('2026-01-05')
    expect(day).toMatchObject({
      completed: false,
      cardsReviewed: review.cardIds.length,
      conceptDone: false,
      questionsAnswered: 0,
    })
    expect(day?.lessonId).toBeUndefined()
    expect(await db.lessonCompletions.count()).toBe(0)
  })

  it('preserves the active session and memo during a content version bump', async () => {
    await resetAppDb()
    await seedCore()
    await db.cards.bulkPut(seedCards('2026-01-05'))
    const session = await startOrResumeSession('2026-01-05')
    await db.activeSession.put({
      ...session,
      step: 'concept',
      conceptMemo: '광종의 노비안검법을 다시 보기',
    })
    const meta = await db.meta.get('meta')
    await db.meta.put({ ...meta!, contentVersion: CONTENT_VERSION - 1 })

    await ensureSeeded()

    expect(await db.activeSession.get(session.id)).toMatchObject({
      id: session.id,
      step: 'concept',
      conceptMemo: '광종의 노비안검법을 다시 보기',
    })
    expect((await db.meta.get('meta'))?.contentVersion).toBe(CONTENT_VERSION)
  })
})
