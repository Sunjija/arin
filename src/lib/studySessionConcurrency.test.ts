import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { exportAllData, restoreBackup } from '../db/backup'
import { flashcardSeeds } from '../data/cards'
import { questions } from '../data/questions'
import { seedCore, resetAppDb } from '../test/idb'
import { completeSession, recordAnswer, startLesson } from './learningApi'
import { advanceSessionCard, getSavedSession, saveSession, saveSessionAnswerCause, startOrResumeSession, submitSessionAnswer } from './studyService'
import { StudySessionConflictError } from './studySessionConcurrency'
import type { ActiveSession } from '../types'

beforeEach(() => seedCore())
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })

async function quiz() {
  const session = await startLesson({ today: '2026-01-05', lessonId: 'lesson-01' })
  const question = questions.find(item => item.id === session.questionIds[0])!
  return saveSession({ ...session, step: 'quiz', conceptDone: true, selectedIndex: (question.answerIndex + 1) % question.choices.length })
}

describe('study session transactions with independent window copies', () => {
  it('allows exactly one concurrent save and rejects stale selection, memo and completion', async () => {
    const initial = await quiz()
    const left = structuredClone(initial)
    const right = structuredClone(initial)
    const results = await Promise.allSettled([
      saveSession({ ...left, conceptMemo: 'window one' }),
      saveSession({ ...right, conceptMemo: 'window two' }),
    ])
    expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(item => item.status === 'rejected')).toHaveLength(1)
    const current = await getSavedSession()
    expect(current.revision).toBe((initial.revision ?? 0) + 1)
    await expect(saveSession({ ...initial, selectedIndex: 3 })).rejects.toBeInstanceOf(StudySessionConflictError)
    await expect(completeSession(initial)).rejects.toBeInstanceOf(StudySessionConflictError)
    expect(await getSavedSession()).toEqual(current)
    expect((await db.studyDays.get(initial.date))?.finishedSessionIds).not.toContain(initial.id)
  })

  it('never recreates an old session after a new run, completion retry, or deleted active row', async () => {
    const old = await quiz()
    const completed = await completeSession(old)
    const next = await startLesson({ today: '2026-01-06', lessonId: 'lesson-01' })
    expect(next.id).not.toBe(old.id)
    await expect(saveSession(old)).rejects.toBeInstanceOf(StudySessionConflictError)
    expect((await completeSession(old)).created).toBe(false)
    expect(await db.activeSession.toArray()).toEqual([next])
    await db.activeSession.clear()
    expect((await completeSession(completed.session)).created).toBe(false)
    expect(await db.activeSession.count()).toBe(0)
    // No completion receipt: a stale first completion cannot resurrect a removed run either.
    await expect(completeSession(next)).rejects.toBeInstanceOf(StudySessionConflictError)
    expect(await db.activeSession.count()).toBe(0)
  })

  it('rolls back answer, wrong log, mastery and feedback together and retries once', async () => {
    const initial = await quiz()
    const mastery = await db.mastery.toArray()
    const progress = await db.conceptProgress.toArray()
    vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('feedback disk full'))
    await expect(submitSessionAnswer(initial, 3210)).rejects.toThrow('feedback disk full')
    expect(await db.attempts.count()).toBe(0)
    expect(await db.wrongAnswers.count()).toBe(0)
    expect(await db.mastery.toArray()).toEqual(mastery)
    expect(await db.conceptProgress.toArray()).toEqual(progress)
    expect(await getSavedSession()).toEqual(initial)
    const saved = await submitSessionAnswer(initial, 3210)
    expect(saved.quizPhase).toBe('feedback')
    expect(saved.answered).toHaveLength(1)
    expect(saved.answered[0]?.responseMs).toBe(3210)
    await expect(submitSessionAnswer(structuredClone(initial), 8000)).rejects.toBeInstanceOf(StudySessionConflictError)
    expect(await db.attempts.count()).toBe(1)
    expect(await db.wrongAnswers.count()).toBe(1)
    expect(await getSavedSession()).toEqual(saved)
  })

  it('recovers a legacy split-write attempt using its original selection, time, cause and snapshot', async () => {
    const initial = await quiz()
    const question = questions.find(item => item.id === initial.questionIds[0])!
    const original = await recordAnswer({ question: { ...question, stem: '당시 저장한 문항 원문' }, correct: false, selectedIndex: initial.selectedIndex!, responseMs: 765,
      cause: 'confused-person', learningSource: 'today', attemptId: `att-${initial.id}-q0-${question.id}` })
    const changed = await saveSession({ ...initial, selectedIndex: question.answerIndex })
    const saved = await submitSessionAnswer(changed, 9999)
    expect(saved.selectedIndex).toBe(original.selectedIndex)
    expect(saved.answered[0]).toMatchObject({ selectedIndex: original.selectedIndex, correct: original.correct, cause: 'confused-person', responseMs: 765 })
    expect((await db.attempts.toArray())[0]).toEqual(original)
    expect(saved.questionSnapshots?.find(item => item.questionId === question.id)).toEqual(original.snapshot)
    expect(await db.attempts.count()).toBe(1)
  })

  it('returns the durable completion for a stale retry without regressing answers or counting twice', async () => {
    const initial = await quiz()
    const feedback = await submitSessionAnswer(initial, 1200)
    const [left, right] = await Promise.all([
      completeSession(structuredClone(feedback)), completeSession(structuredClone(feedback)),
    ])
    expect([left.created, right.created].sort()).toEqual([false, true])
    expect(left.session).toEqual(right.session)
    expect((await completeSession(initial)).session).toEqual(left.session)
    expect((await getSavedSession()).answered).toEqual(feedback.answered)
    expect((await db.studyDays.get(initial.date))?.questionsAnswered).toBe(1)
  })

  it('commits cause edits with feedback and rejects a stale second cause', async () => {
    const initial = await submitSessionAnswer(await quiz(), null)
    const attempt = (await db.attempts.toArray())[0]!
    vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('cause disk full'))
    await expect(saveSessionAnswerCause(initial, 'confused-person')).rejects.toThrow('cause disk full')
    expect((await db.attempts.get(attempt.id))?.cause).toBe('unknown')
    expect((await db.wrongAnswers.get(`wrong-${attempt.id}`))?.cause).toBe('unknown')
    const saved = await saveSessionAnswerCause(initial, 'confused-person')
    await expect(saveSessionAnswerCause(initial, 'confused-order')).rejects.toBeInstanceOf(StudySessionConflictError)
    expect(saved.answered[0]?.cause).toBe('confused-person')
    expect((await db.attempts.get(attempt.id))?.cause).toBe('confused-person')
    expect(await db.attempts.count()).toBe(1)
  })

  it('rolls back card interval and completion if progress fails; concurrent retry rates once', async () => {
    const seed = flashcardSeeds[0]!
    const card = { ...seed, fingerprint: seed.id, createdAt: '2026-01-05', updatedAt: '2026-01-05', nextReviewAt: '2026-01-05', intervalDays: 0, easeStreak: 0, lapses: 0 }
    await db.cards.put(card)
    const initial = await quiz()
    const session = await saveSession({ ...initial, entryMode: 'review', step: 'cards', questionIds: [], cardIds: [card.id] })
    vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('card disk full'))
    await expect(advanceSessionCard(session, 'again', false)).rejects.toThrow('card disk full')
    expect(await db.cards.get(card.id)).toEqual(card)
    expect(await getSavedSession()).toEqual(session)
    expect((await db.studyDays.get(session.date))?.finishedSessionIds).not.toContain(session.id)
    const results = await Promise.allSettled([
      advanceSessionCard(structuredClone(session), 'again', false),
      advanceSessionCard(structuredClone(session), 'again', false),
    ])
    expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1)
    expect((await db.cards.get(card.id))?.lapses).toBe(1)
    expect((await db.studyDays.get(session.date))?.cardsReviewed).toBe(1)
    expect((await getSavedSession()).step).toBe('result')
  })

  it('normalizes legacy phases from the current row and preserves revisionless snapshots across backup versions', async () => {
    const started = await startLesson({ today: '2026-01-05' })
    const legacy: ActiveSession = { ...started, step: 'quiz', quizPhase: 'stem', revision: undefined, conceptMemo: 'preserved memo' }
    await db.activeSession.put(legacy)
    const backup = await exportAllData()
    for (const version of [1, 2, 3, 4] as const) {
      expect((await restoreBackup({ ...backup, version })).ok).toBe(true)
      const [left, right] = await Promise.all([
        startOrResumeSession('2026-01-06'), startOrResumeSession('2026-01-07'),
      ])
      expect(left).toEqual(right)
      expect(left).toMatchObject({ id: legacy.id, revision: 1, quizPhase: 'choices', conceptMemo: 'preserved memo' })
      expect(left.questionSnapshots).toEqual(legacy.questionSnapshots)
      expect(left.guideSnapshots).toEqual(legacy.guideSnapshots)
      expect(left.questionContexts).toEqual(legacy.questionContexts)
    }
    const before = await getSavedSession()
    for (const revision of [-1, 0.5, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
      expect((await restoreBackup({ ...backup, activeSession: { ...legacy, revision } })).ok).toBe(false)
      expect(await getSavedSession()).toEqual(before)
    }
    const currentBackup = await exportAllData()
    expect((await restoreBackup(currentBackup)).ok).toBe(true)
    expect(await getSavedSession()).toEqual(before)
  })
})
