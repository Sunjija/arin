import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import { flashcardSeeds } from '../data/cards'
import { db } from '../db/database'
import { resetAppDb, seedCore } from '../test/idb'
import {
  completeSession,
  computeStudyPlan,
  recordAnswer,
  recordConceptView,
  saveGoal,
  startLesson,
} from './learningApi'
import { buildTodayPlan, finishSession, startOrResumeSession } from './studyService'
import { addDays } from './dates'

afterEach(async () => {
  await resetAppDb()
})

describe('learning foundation', () => {
  it('keeps the incomplete lesson after absence instead of calendar-skipping', async () => {
    await seedCore({ startDate: '2026-09-01' })
    const first = await computeStudyPlan('2026-09-01')
    expect(first.currentLessonId).toBe('lesson-01')
    const afterGap = await computeStudyPlan('2026-09-04')
    expect(afterGap.currentLessonId).toBe('lesson-01')
    expect(afterGap.missedStudyDays).toBeGreaterThan(0)
  })

  it('does not put unseen-era cards into automatic review', async () => {
    await seedCore()
    await db.cards.bulkPut(
      flashcardSeeds.map((card) => ({
        ...card,
        fingerprint: card.id,
        createdAt: '2026-01-05',
        updatedAt: '2026-01-05',
        nextReviewAt: '2026-01-05',
        intervalDays: 0,
        easeStreak: 0,
        lapses: 0,
      })),
    )
    const plan = await computeStudyPlan('2026-01-05')
    expect(plan.reviewCardCount).toBe(0)
    const session = await startLesson({ today: '2026-01-05' })
    expect(session.step).toBe('concept')
    expect(session.cardIds).toEqual([])
    expect(session.newQuestionIds?.every((id) => questions.find((item) => item.id === id)?.lessonId === 'lesson-01')).toBe(true)
  })

  it('reviews completed eras while new questions stay in the current lesson', async () => {
    await seedCore()
    await db.lessonCompletions.put({
      lessonId: 'lesson-01',
      firstCompletedAt: '2026-01-05',
      lastCompletedAt: '2026-01-05',
      completionCount: 1,
    })
    await db.cards.bulkPut(
      flashcardSeeds
        .filter((card) => card.era === 'prehistoric' || card.era === 'goryeo')
        .map((card) => ({
          ...card,
          fingerprint: card.id,
          createdAt: '2026-01-05',
          updatedAt: '2026-01-05',
          nextReviewAt: '2026-01-06',
          intervalDays: 1,
          easeStreak: 0,
          lapses: 0,
        })),
    )
    const plan = await computeStudyPlan('2026-01-06')
    expect(plan.currentLessonId).toBe('lesson-02')
    expect(plan.reviewCardIds.length).toBeGreaterThan(0)
    const reviewCards = await db.cards.bulkGet(plan.reviewCardIds)
    expect(reviewCards.every((card) => card?.era === 'prehistoric')).toBe(true)
    expect(plan.newQuestionIds.every((id) => questions.find((item) => item.id === id)?.lessonId === 'lesson-02')).toBe(true)
  })

  it('stores library answers in the same attempt log without completing a concept from a view', async () => {
    await seedCore()
    const question = questions.find((item) => item.lessonId === 'lesson-01')!
    const viewed = await recordConceptView({ conceptId: 't-pre-01', at: '2026-01-05' })
    expect(viewed.learnState).toBe('unseen')
    expect(viewed.viewedAt).toBe('2026-01-05')
    const attempt = await recordAnswer({
      question,
      selectedIndex: 1,
      correct: false,
      responseMs: null,
      learningSource: 'library',
      attemptId: 'att-lib-1',
    })
    expect(attempt.learningSource).toBe('library')
    expect(await db.attempts.get('att-lib-1')).toEqual(attempt)
    const again = await recordAnswer({
      question,
      selectedIndex: 0,
      correct: true,
      responseMs: 1200,
      learningSource: 'library',
      attemptId: 'att-lib-1',
    })
    expect(again.id).toBe('att-lib-1')
    expect(again.correct).toBe(false)
    const progress = await db.conceptProgress.get(attempt.conceptId ?? 't-pre-01')
    expect(progress?.learnState).not.toBe('completed')
  })

  it('completes a lesson only when the concept step is done', async () => {
    await seedCore({ startDate: '2026-01-05' })
    const session = await startLesson({ today: '2026-01-05' })
    await completeSession({ ...session, conceptDone: false, entryMode: 'daily' })
    expect(await db.lessonCompletions.get('lesson-01')).toBeUndefined()
    const again = await startLesson({ today: '2026-01-06' })
    await completeSession({ ...again, conceptDone: true, entryMode: 'daily' })
    expect((await db.lessonCompletions.get('lesson-01'))?.lessonId).toBe('lesson-01')
  })

  it('saves undecided and past exam dates without skipping remaining lessons', async () => {
    await seedCore({ startDate: '2026-09-01' })
    const undecided = await saveGoal({ examDateUndecided: true, examDate: null })
    expect(undecided.ok).toBe(true)
    if (undecided.ok) expect(undecided.value.examDateUndecided).toBe(true)
    const past = await saveGoal({ examDate: '2026-01-01', examDateUndecided: false })
    expect(past.ok).toBe(true)
    const plan = await computeStudyPlan('2026-09-11')
    expect(plan.examDateMode).toBe('past')
    expect(plan.currentLessonId).toBe('lesson-01')
    expect(plan.warnings.some((line) => line.includes('건너뛰지 않'))).toBe(true)
  })

  it('freezes the same-day plan across rebuilds', async () => {
    await seedCore({ startDate: '2026-01-05' })
    const first = await computeStudyPlan('2026-01-05')
    await db.lessonCompletions.put({
      lessonId: 'lesson-01',
      firstCompletedAt: '2026-01-05',
      lastCompletedAt: '2026-01-05',
      completionCount: 1,
    })
    const again = await computeStudyPlan('2026-01-05')
    expect(again.currentLessonId).toBe(first.currentLessonId)
    expect(again.newQuestionIds).toEqual(first.newQuestionIds)
  })
})

describe('today plan through the frozen API', () => {
  it('stays on lesson-01 until it is completed', async () => {
    await seedCore({ startDate: '2026-01-05', planWeeks: 8 })
    const seen = new Set<string>()
    for (let day = 0; day < 10; day += 1) {
      const plan = await buildTodayPlan(addDays('2026-01-05', day))
      seen.add(plan.lesson.id)
    }
    expect(seen).toEqual(new Set(['lesson-01']))
    await db.lessonCompletions.put({
      lessonId: 'lesson-01',
      firstCompletedAt: '2026-01-05',
      lastCompletedAt: '2026-01-05',
      completionCount: 1,
    })
    await db.studyDays.clear()
    const next = await buildTodayPlan('2026-01-15')
    expect(next.lesson.id).toBe('lesson-02')
  })

  it('resumes an in-progress session without rewriting its list', async () => {
    await seedCore()
    const session = await startOrResumeSession('2026-01-05')
    await db.activeSession.put({ ...session, questionIds: ['q-foreign', ...session.questionIds], step: 'quiz' })
    const resumed = await startOrResumeSession('2026-01-05')
    expect(resumed.questionIds[0]).toBe('q-foreign')
    await finishSession({ ...resumed, conceptDone: true })
    expect((await db.studyDays.get('2026-01-05'))?.finishedSessionIds).toContain(resumed.id)
  })
})
