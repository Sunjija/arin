import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { lessons } from '../data/lessons'
import { addDays } from './dates'
import {
  buildTodayPlan,
  finishSession,
  getProgressSnapshot,
  startOrResumeSession,
} from './studyService'
import { CONTENT_VERSION, ensureSeeded, seedCards } from '../db/seed'
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

  it('starts review even when every due card belongs to another era', async () => {
    await resetAppDb()
    await seedCore({ startDate: '2026-01-05' })
    const plan = await buildTodayPlan('2026-01-05')
    const foreign = seedCards('2026-01-05').find((card) => card.era !== plan.lesson.era)
    expect(foreign).toBeDefined()
    await db.cards.put({ ...foreign!, nextReviewAt: '2026-01-05' })

    const review = await startOrResumeSession({ today: '2026-01-05', entryMode: 'review' })
    expect(review.cardIds).toContain(foreign!.id)
    expect(review.step).toBe('cards')
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
