import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { questions } from '../data/questions'
import { resetAppDb, seedCore, practiceAttempt } from '../test/idb'
import { computeStudyPlan, startLesson, snapshotFromQuestion, selectReview } from './learningApi'
import { makeQuestionStudyContext, questionContextCopy, recentWrongAttempts, sessionExposureStats } from './questionStudyContext'
import { selectStudyQuestions } from './questionSelection'
import type { AttemptRecord, Question } from '../types'

const prehistoric = questions.find(q => q.lessonId === 'lesson-01')!
const goryeo = questions.filter(q => q.era === 'goryeo').slice(0, 2)
function attempt(id: string, q: Question, correct: boolean, date: string): AttemptRecord {
  return { ...practiceAttempt(id, correct, date), questionId: q.id, era: q.era, tags: q.tags, snapshot: snapshotFromQuestion(q) }
}
afterEach(resetAppDb)

describe('review selection evidence and submitted-answer history', () => {
  it('uses the latest answer within seven calendar days, excluding resolved, old and future errors', () => {
    const rows = [
      attempt('resolved-wrong', { ...prehistoric, id: 'resolved' }, false, '2026-01-03'),
      attempt('resolved-right', { ...prehistoric, id: 'resolved' }, true, '2026-01-04'),
      attempt('recent', { ...prehistoric, id: 'recent' }, false, '2026-01-05'),
      attempt('boundary', { ...prehistoric, id: 'boundary' }, false, '2025-12-30'),
      attempt('old', { ...prehistoric, id: 'old' }, false, '2025-12-29'),
      attempt('future', { ...prehistoric, id: 'future' }, false, '2026-01-06'),
    ]
    expect([...recentWrongAttempts(rows.reverse(), '2026-01-05').keys()].sort()).toEqual(['boundary', 'recent'])
  })

  it('records the bucket actually used, gives due items precedence, and fills vacancies with remaining due items', () => {
    const pool = ['due1', 'due2', 'due3', 'wrong', 'extra'].map(id => ({ ...prehistoric, id }))
    const result = selectStudyQuestions({ questions: pool, masteryEras: {} as never, masteryTypes: {} as never,
      dueReviewQuestionIds: ['due1', 'due2', 'due3'], recentWrongIds: ['due1', 'wrong'],
      learnedLessonIds: ['lesson-01'], newCount: 0, reviewCount: 5, count: 5 })
    expect(result.reviewReasons).toEqual({ due1: 'due-review', due2: 'due-review', due3: 'due-review', wrong: 'recent-wrong', extra: 'review-practice' })
    expect(new Set(result.all.map(q => q.id)).size).toBe(5)
  })

  it('uses the learner local day for ISO timestamps around midnight', () => {
    const justAfterMidnight = new Date(2026, 0, 6, 0, 15).toISOString()
    const row = attempt('midnight', prehistoric, false, justAfterMidnight)
    expect(recentWrongAttempts([row], '2026-01-05').size).toBe(0)
    expect(recentWrongAttempts([row], '2026-01-06').has(prehistoric.id)).toBe(true)
    const right = { ...row, id: 'right-same-time', correct: true }
    expect(recentWrongAttempts([right, row], '2026-01-06').size).toBe(0)
  })

  it('counts unique submitted answers and explicitly mapped similar questions without inventing unknown families', () => {
    const q = { ...prehistoric, familyId: 'family-a' }
    const same = attempt('same', q, true, '2026-01-01')
    const similar = attempt('similar', { ...q, id: 'different-id' }, true, '2026-01-02')
    const row = makeQuestionStudyContext({ question: q, reason: 'review-practice', selectedOn: '2026-01-05', attempts: [same, same, similar] })
    expect(row).toMatchObject({ priorAttemptCount: 1, similarQuestionAttemptCount: 1, dueOn: null, lastWrongAt: null })
    const unknown = makeQuestionStudyContext({ question: { ...q, familyId: undefined }, reason: 'new-concept', selectedOn: '2026-01-05', attempts: [] })
    expect(unknown.similarQuestionAttemptCount).toBeNull()
    expect(questionContextCopy(unknown).historyDetail).toContain('확인할 수 없습니다')
    expect(questionContextCopy().historyLabel).toContain('미확인')
  })

  it('counts first, repeated and unknown answers separately without counting repeated callbacks twice', () => {
    const contexts = [makeQuestionStudyContext({ question: prehistoric, reason: 'new-concept', selectedOn: '2026-01-05', attempts: [] }),
      makeQuestionStudyContext({ question: goryeo[0]!, reason: 'review-practice', selectedOn: '2026-01-05', attempts: [attempt('old', goryeo[0]!, false, '2026-01-01')] })]
    const answers = [{ questionId: prehistoric.id, correct: true, selectedIndex: 0, responseMs: null },
      { questionId: goryeo[0]!.id, correct: false, selectedIndex: 1, responseMs: null },
      { questionId: 'legacy', correct: true, selectedIndex: 0, responseMs: null }]
    expect(sessionExposureStats({ answered: [...answers, answers[0]!], questionContexts: contexts })).toEqual({
      first: { total: 1, correct: 1 }, repeated: { total: 1, correct: 0 }, unknown: { total: 1, correct: 1 },
    })
  })

  it('includes due questions from other learned eras even when their cards exceed the daily card cap', async () => {
    await seedCore({ dailyCardCount: 3 })
    const dueQuestions = questions.filter(q => q.era === 'goryeo').slice(0, 4)
    for (const [index, q] of dueQuestions.entries()) {
      await db.attempts.put(attempt(`goryeo-${index}`, q, true, '2026-01-01'))
      await db.cards.put({ id: `due-${index}`, kind: 'concept', front: q.stem, back: q.explanation, era: q.era, tags: q.tags,
        sourceQuestionId: q.id, fingerprint: `due-${index}`, createdAt: '2026-01-01', updatedAt: '2026-01-01', nextReviewAt: '2026-01-04', intervalDays: 3, easeStreak: 0, lapses: 0 })
    }
    const plan = await computeStudyPlan('2026-01-05')
    expect(plan.reviewCardIds).toHaveLength(3)
    expect(plan.questionContexts?.filter(c => c.reason === 'due-review')).toHaveLength(4)
    expect(plan.reviewQuestionIds.sort()).toEqual(dueQuestions.map(q => q.id).sort())
    expect((await selectReview('2026-01-05')).recentWrongItems).toEqual([])
  })

  it('refreshes history at session start and freezes it through submission, midnight and later answers', async () => {
    await seedCore()
    const plan = await computeStudyPlan('2026-01-05')
    const id = plan.newQuestionIds[0]!
    const q = questions.find(item => item.id === id)!
    expect(plan.questionContexts?.find(c => c.questionId === id)?.priorAttemptCount).toBe(0)
    await db.attempts.put(attempt('before-start', q, true, '2026-01-05'))
    const session = await startLesson({ today: '2026-01-05' })
    expect(session.questionContexts?.find(c => c.questionId === id)?.priorAttemptCount).toBe(1)
    await db.attempts.put(attempt('after-start', q, true, '2026-01-05'))
    expect((await startLesson({ today: '2026-01-06' })).questionContexts).toEqual(session.questionContexts)
    expect((await computeStudyPlan('2026-01-06')).questionContexts).toEqual(session.questionContexts)
  })
})
