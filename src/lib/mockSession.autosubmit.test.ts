import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuestionSnapshot } from '../types'
import {
  createSubmitOnce,
  snapshotForAutoSubmit,
} from '../components/mock/mockExamLogic'
import { SAMPLE_DURATION_MS, finalizeMock, gradeActiveMock, saveMockProgress, startMock } from './mockSession'
import { db } from '../db/database'
import { resetAppDb } from '../test/idb'

function snap(id: string, answerIndex: number): QuestionSnapshot {
  return {
    questionId: id,
    stem: `stem-${id}`,
    passage: `passage-${id}`,
    choices: ['가', '나', '다', '라', '마'],
    answerIndex,
    explanation: `explain-${id}`,
    era: 'goryeo',
    tags: ['chronology'],
    difficulty: 1,
  }
}

afterEach(async () => {
  vi.useRealTimers()
  await resetAppDb()
})

describe('mock auto-submit persistence', () => {
  it('stores the latest answers, score, and elapsed time when the virtual clock hits the deadline', async () => {
    await resetAppDb()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))

    const snapshots = [snap('q-a', 1), snap('q-b', 0)]
    const started = await startMock({
      mode: 'sample',
      snapshots,
      durationMs: SAMPLE_DURATION_MS,
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const deadlineAt = started.mock.deadlineAt

    const answersRef = { current: [...started.mock.answers] }
    answersRef.current = [1, 0]
    const saved = await saveMockProgress({
      id: started.mock.id,
      revision: started.mock.revision,
      answers: answersRef.current,
      currentIndex: 1,
      itemElapsedMs: [1200, 800],
    })
    expect(saved.ok).toBe(true)
    if (saved.ok) {
      expect(saved.mock.deadlineAt).toBe(deadlineAt)
    }

    vi.setSystemTime(new Date('2026-09-08T00:16:00.000Z'))
    const payload = snapshotForAutoSubmit({
      id: started.mock.id,
      revision: saved.ok ? saved.mock.revision : 1,
      getAnswers: () => answersRef.current,
      getItemElapsedMs: () => [1200, 800],
    })
    const lock = createSubmitOnce()
    const first = lock.run(() => finalizeMock(payload))
    const second = lock.run(() => finalizeMock(payload))
    const [ran, skipped] = await Promise.all([first, second])
    expect(ran.status).toBe('ran')
    expect(skipped.status).toBe('skipped')
    if (ran.status !== 'ran') return

    expect(ran.value.created).toBe(true)
    expect(ran.value.result.answers.map((row) => row.selectedIndex)).toEqual([1, 0])
    expect(ran.value.result.correct).toBe(2)
    expect(ran.value.result.score).toBe(100)
    expect(ran.value.result.durationSec).toBe(16 * 60)

    const again = await finalizeMock(payload)
    expect(again.created).toBe(false)
    expect(await db.mockResults.count()).toBe(1)
  })

  it('grades from the current answer buffer rather than the start-of-exam snapshot', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
    const snapshots = [snap('q-a', 1), snap('q-b', 0)]
    const startedAt = new Date().toISOString()
    const initial = {
      id: 'mock-stale',
      revision: 1,
      mode: 'sample' as const,
      status: 'in-progress' as const,
      questionSnapshots: snapshots,
      answers: [null, null] as Array<number | null>,
      itemElapsedMs: [null, null] as Array<number | null>,
      currentIndex: 0,
      startedAt,
      deadlineAt: new Date(Date.parse(startedAt) + SAMPLE_DURATION_MS).toISOString(),
      updatedAt: startedAt,
    }
    const answersRef = { current: initial.answers }
    answersRef.current = [1, 0]
    vi.setSystemTime(new Date('2026-09-08T00:16:00.000Z'))
    const result = gradeActiveMock({ ...initial, answers: answersRef.current }, Date.now())
    expect(result.score).toBe(100)
    expect(result.durationSec).toBe(16 * 60)
    expect(result.answers.every((row) => row.selectedIndex == null)).toBe(false)
  })
})
