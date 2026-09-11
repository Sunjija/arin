import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { resetAppDb, seedCore } from '../test/idb'
import { questions } from '../data/questions'
import { recordAnswer, startLesson, completeSession, saveGoal, computeStudyPlan } from './learningApi'
import { startMock, finalizeMock } from './mockSession'
import { snapshotFromQuestion } from './learningApi'
import { exportAllData, restoreBackup } from '../db/backup'
const question = questions[0]!
const input = { question, selectedIndex: question.answerIndex, correct: true, responseMs: null, learningSource: 'library' as const, attemptId: 'review-idempotent' }
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })
describe('P0 independent acceptance review', () => {
  it('rolls back all answer writes when mastery storage fails', async () => {
    await seedCore()
    vi.spyOn(db.mastery, 'put').mockRejectedValueOnce(new Error('storage failure'))
    await expect(recordAnswer(input)).rejects.toThrow()
    expect(await db.attempts.count()).toBe(0)
  })
  it('applies concurrent retries once', async () => {
    await seedCore()
    const writes = vi.spyOn(db.mastery, 'put')
    await Promise.all([recordAnswer(input), recordAnswer(input)])
    expect(writes).toHaveBeenCalledTimes(1)
  })
  it('starts the requested lesson with its own question pool', async () => {
    await seedCore()
    const session = await startLesson({ today: '2026-01-05', lessonId: 'lesson-02' })
    expect(session.questionIds.length).toBeGreaterThan(0)
    expect(session.questionIds.every(id => questions.find(q => q.id === id)?.lessonId === 'lesson-02')).toBe(true)
  })
  it('preserves an unfinished session after midnight', async () => {
    await seedCore()
    const first = await startLesson({ today: '2026-01-05' })
    const resumed = await startLesson({ today: '2026-01-06' })
    expect(resumed.id).toBe(first.id)
  })
  it('rolls back completion if lesson persistence fails', async () => {
    await seedCore()
    const session = await startLesson({ today: '2026-01-05', lessonId: 'lesson-01' })
    vi.spyOn(db.lessonCompletions, 'put').mockRejectedValueOnce(new Error('storage failure'))
    await expect(completeSession({ ...session, conceptDone: true, answered: session.questionIds.map(questionId => ({ questionId, selectedIndex: 0, correct: true, responseMs: null, attemptId: `test-${questionId}` })) })).rejects.toThrow()
    expect((await db.studyDays.get(session.date))?.finishedSessionIds ?? []).not.toContain(session.id)
  })
  it('rejects impossible goal dates without storing them', async () => {
    await seedCore()
    expect((await saveGoal({ examDate: '2026-02-31', examDateUndecided: false })).ok).toBe(false)
  })
  it('rejects corrupted v3 progress before replacing the database', async () => {
    await seedCore()
    const backup = await exportAllData()
    const result = await restoreBackup({ ...backup, conceptProgress: [{ conceptId: 't-pre-01', learnState: 'not-a-state' }] })
    expect(result.ok).toBe(false)
  })
  it('does not admit unseen lessons merely because their era is completed', async () => {
    await seedCore()
    await db.lessonCompletions.put({ lessonId: 'lesson-04', firstCompletedAt: '2026-01-01', lastCompletedAt: '2026-01-01', completionCount: 1 })
    const unseen = questions.find(q => q.era === 'goryeo' && q.lessonId === 'lesson-05')!
    await db.cards.put({ id:'review-unseen', kind:'concept', front:unseen.stem, back:unseen.explanation, era:unseen.era, tags:unseen.tags, sourceQuestionId:unseen.id, fingerprint:'unseen', createdAt:'2026-01-01', updatedAt:'2026-01-01', nextReviewAt:'2026-01-01', intervalDays:1, easeStreak:0, lapses:0 })
    expect((await computeStudyPlan('2026-01-05')).reviewCardIds).not.toContain('review-unseen')
  })
  it('keeps the next-day plan aligned with the resumed session', async () => {
    await seedCore()
    const session = await startLesson({ today: '2026-01-05' })
    const plan = await computeStudyPlan('2026-01-06')
    expect([...plan.newQuestionIds, ...plan.reviewQuestionIds]).toEqual(session.questionIds)
    expect(plan.reviewCardIds).toEqual(session.cardIds)
  })
  it('does not complete a lesson just by finishing its reading', async () => {
    await seedCore()
    const session = await startLesson({ today: '2026-01-05' })
    await completeSession({ ...session, conceptDone: true })
    expect(await db.lessonCompletions.count()).toBe(0)
    expect((await db.studyDays.get(session.date))?.completed).toBe(false)
  })
  it('grades and records mock answers from the frozen source atomically', async () => {
    await seedCore()
    const snapshot = { ...snapshotFromQuestion(question), stem: 'frozen source', answerIndex: (question.answerIndex + 1) % 5 }
    const started = await startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 60000 })
    if (!started.ok) throw new Error('fixture setup failed')
    vi.spyOn(db.mastery, 'put').mockRejectedValueOnce(new Error('storage failure'))
    const args = { id: started.mock.id, answers: [snapshot.answerIndex] }
    await expect(finalizeMock(args)).rejects.toThrow('storage failure')
    expect(await db.attempts.count()).toBe(0)
    expect(await db.mockResults.count()).toBe(0)
    expect((await db.activeMock.get(args.id))?.status).toBe('in-progress')
    await Promise.all([finalizeMock(args), finalizeMock(args)])
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]?.correct).toBe(true)
    expect(attempts[0]?.snapshot?.stem).toBe('frozen source')
    expect(attempts[0]?.learningSource).toBe('mock')
  })
  it('rejects corrupted session snapshots without changing existing records', async () => {
    await seedCore()
    await startLesson({ today: '2026-01-05' })
    const before = await exportAllData()
    const result = await restoreBackup({ ...before, activeSession: { ...before.activeSession, questionSnapshots: [{ questionId: 'q-01' }] } })
    expect(result.ok).toBe(false)
    expect((await exportAllData()).activeSession).toEqual(before.activeSession)
  })

})
