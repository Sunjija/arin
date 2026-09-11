import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { seedCore, resetAppDb } from '../test/idb'
import { questions } from '../data/questions'
import { startLesson } from './learningApi'
import { advanceLibraryPractice, getLibraryPractice, restartLibraryPractice, selectLibraryChoice, startLibraryPractice, submitLibraryAnswer } from './libraryPractice'
import type { LibraryPracticeSession } from '../types'
export const itemKey = (row: LibraryPracticeSession) => ({ lessonId: row.lessonId, sessionId: row.id, questionId: row.questionSnapshots[row.questionIndex]!.questionId, revision: row.revision })
beforeEach(async () => { await seedCore() })
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })

describe('persistent library practice', () => {
  it('keeps unsubmitted selection, feedback, score and next position without touching the daily session', async () => {
    const daily = await startLesson({ today: '2026-01-05' })
    const started = await startLibraryPractice('lesson-01')
    const selected = await selectLibraryChoice({ ...itemKey(started), selectedIndex: started.questionSnapshots[0]!.answerIndex })
    expect(await getLibraryPractice('lesson-01')).toEqual(selected)
    expect(await db.attempts.count()).toBe(0)
    const feedback = await submitLibraryAnswer(itemKey(selected))
    expect(feedback.answers[0]?.correct).toBe(true)
    expect((await startLibraryPractice('lesson-01')).step).toBe('feedback')
    const next = await advanceLibraryPractice(itemKey(feedback))
    expect(next.questionIndex).toBe(1)
    expect(next.selectedIndex).toBeNull()
    expect((await getLibraryPractice('lesson-01'))?.answers).toHaveLength(1)
    expect(await db.activeSession.get(daily.id)).toEqual(daily)
    expect(await db.lessonCompletions.count()).toBe(0)
    expect((await db.conceptProgress.toArray()).some(row => row.learnState === 'completed')).toBe(false)
  })
  it('records simultaneous submissions and repeated next clicks only once', async () => {
    const started = await startLibraryPractice('lesson-01')
    const selected = await selectLibraryChoice({ ...itemKey(started), selectedIndex: 0 })
    const [first, second] = await Promise.all([submitLibraryAnswer(itemKey(selected)), submitLibraryAnswer(itemKey(selected))])
    expect(first).toEqual(second)
    expect(await db.attempts.count()).toBe(1)
    const [next, retried] = await Promise.all([advanceLibraryPractice(itemKey(first)), advanceLibraryPractice(itemKey(first))])
    expect(next).toEqual(retried)
    expect(next.questionIndex).toBe(1)
    await submitLibraryAnswer(itemKey(selected))
    expect((await getLibraryPractice('lesson-01'))?.step).toBe('question')
    expect(await db.attempts.count()).toBe(1)
  })
  it('rolls back the answer when the practice state cannot be saved', async () => {
    const started = await startLibraryPractice('lesson-01')
    const selected = await selectLibraryChoice({ ...itemKey(started), selectedIndex: (started.questionSnapshots[0]!.answerIndex + 1) % 5 })
    const mastery = await db.mastery.get('mastery')
    vi.spyOn(db.libraryPractice, 'put').mockRejectedValueOnce(new Error('disk full'))
    await expect(submitLibraryAnswer(itemKey(selected))).rejects.toThrow('disk full')
    expect(await db.attempts.count()).toBe(0)
    expect(await db.wrongAnswers.count()).toBe(0)
    expect(await db.mastery.get('mastery')).toEqual(mastery)
    expect(await getLibraryPractice('lesson-01')).toEqual(selected)
    const saved = await submitLibraryAnswer(itemKey(selected))
    expect(saved.answers).toHaveLength(1)
    expect(await db.attempts.count()).toBe(1)
    expect(await db.wrongAnswers.count()).toBe(1)
  })
  it('freezes question content and validates its answer against the original on resume', async () => {
    const started = await startLibraryPractice('lesson-01')
    const source = questions.find(question => question.id === started.questionSnapshots[0]!.questionId)!
    const original = source.answerIndex
    try {
      source.answerIndex = (original + 1) % 5
      const resumed = await startLibraryPractice('lesson-01')
      expect(resumed.questionSnapshots[0]!.answerIndex).toBe(original)
      const selected = await selectLibraryChoice({ ...itemKey(resumed), selectedIndex: original })
      expect((await submitLibraryAnswer(itemKey(selected))).answers[0]!.correct).toBe(true)
    } finally { source.answerIndex = original }
  })
  it('isolates lessons and rejects stale selections from another tab', async () => {
    const first = await startLibraryPractice('lesson-01')
    const other = await startLibraryPractice('lesson-02')
    expect(other.questionSnapshots.every(question => question.lessonId === 'lesson-02')).toBe(true)
    const updated = await selectLibraryChoice({ ...itemKey(first), selectedIndex: 0 })
    await expect(selectLibraryChoice({ ...itemKey(first), selectedIndex: 1 })).rejects.toThrow('다른 창')
    expect(await getLibraryPractice('lesson-01')).toEqual(updated)
    expect(await getLibraryPractice('lesson-02')).toEqual(other)
    await expect(advanceLibraryPractice(itemKey(updated))).rejects.toThrow('답을 확인')
  })
  it('keeps completed results on reload and starts a separate run only after explicit replay', async () => {
    let row = await startLibraryPractice('lesson-01')
    const firstId = row.id
    while (row.step !== 'result') {
      row = await selectLibraryChoice({ ...itemKey(row), selectedIndex: row.questionSnapshots[row.questionIndex]!.answerIndex })
      row = await submitLibraryAnswer(itemKey(row))
      row = await advanceLibraryPractice(itemKey(row))
    }
    expect(await startLibraryPractice('lesson-01')).toEqual(row)
    expect(row.answers.every(answer => answer.correct)).toBe(true)
    const restarted = await restartLibraryPractice({ lessonId: row.lessonId, sessionId: row.id })
    expect(restarted.id).not.toBe(firstId)
    expect(restarted.answers).toEqual([])
    expect(await db.attempts.count()).toBe(row.questionSnapshots.length)
    await expect(submitLibraryAnswer({ lessonId: row.lessonId, sessionId: row.id, questionId: row.questionSnapshots[0]!.questionId, revision: 0 })).rejects.toThrow('다른 창')
    await expect(restartLibraryPractice({ lessonId: restarted.lessonId, sessionId: restarted.id })).rejects.toThrow('진행 중')
  })
})
