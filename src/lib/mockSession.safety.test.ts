import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { resetAppDb } from '../test/idb'
import { finalizeMock, saveMockProgress, startMock } from './mockSession'
import { validateExportPayload } from './backupValidate'
import { defaultSettings, defaultMastery } from '../data/defaults'
import type { QuestionSnapshot } from '../types'

const snapshot: QuestionSnapshot = {
  questionId: 'original', stem: 'Original stem', choices: ['one', 'two', 'three', 'four', 'five'],
  answerIndex: 1, explanation: 'Original explanation', era: 'goryeo', tags: [], difficulty: 2,
}

async function start() {
  const outcome = await startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 10000 })
  if (!outcome.ok) throw new Error('start failed')
  return outcome.mock
}

beforeEach(async () => { await resetAppDb() })
afterEach(async () => { vi.restoreAllMocks(); vi.useRealTimers(); await resetAppDb() })

describe('mock durable safety', () => {
  it('serializes concurrent starts and progress writes without losing the winning revision', async () => {
    const starts = await Promise.all([startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 10000 }), startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 10000 })])
    expect(starts.filter(result => result.ok)).toHaveLength(1)
    const mock = (await db.activeMock.toArray())[0]!
    const writes = await Promise.all([0, 1].map(choice => saveMockProgress({ id: mock.id, revision: 1, answers: [choice], currentIndex: 0, itemElapsedMs: [10] })))
    expect(writes.filter(result => result.ok)).toHaveLength(1)
    expect(writes.find(result => !result.ok)).toMatchObject({ code: 'stale-revision' })
    expect((await db.activeMock.get(mock.id))!.answers).toEqual([0])
  })

  it('retains result snapshots, pre-exam exposure and idempotence after the next active exam replaces it', async () => {
    const first = await start()
    const finalized = await finalizeMock({ id: first.id, revision: first.revision, answers: [1], itemElapsedMs: [100] })
    expect(finalized.result.questionSnapshots?.[0]).toMatchObject({ stem: 'Original stem', priorAttemptCount: 0 })
    const next = await start()
    expect(next.questionSnapshots[0]!.priorAttemptCount).toBe(1)
    expect(next.id).not.toBe(first.id)
    next.questionSnapshots[0]!.stem = 'Updated bank'
    await db.activeMock.put(next)
    const reread = await db.mockResults.get(first.id)
    expect(reread!.questionSnapshots?.[0]!.stem).toBe('Original stem')
    expect((await finalizeMock({ id: first.id })).created).toBe(false)
    expect(await db.attempts.count()).toBe(1)
  })

  it('rolls back result and attempts on a write failure and retries the same submission once', async () => {
    const mock = await start()
    const failed = vi.spyOn(db.activeMock, 'put').mockRejectedValueOnce(new Error('quota'))
    const input = { id: mock.id, revision: mock.revision, answers: [1], itemElapsedMs: [100] }
    await expect(finalizeMock(input)).rejects.toThrow('quota')
    expect(await db.mockResults.count()).toBe(0)
    expect(await db.attempts.count()).toBe(0)
    failed.mockRestore()
    const outcomes = await Promise.all([finalizeMock(input), finalizeMock(input)])
    expect(outcomes.filter(result => result.created)).toHaveLength(1)
    expect(await db.attempts.count()).toBe(1)
  })

  it('retains the last pre-deadline save and rejects late edits including finalization overrides', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-13T00:00:00Z'))
    const mock = await start()
    vi.setSystemTime(Date.parse(mock.deadlineAt) - 1)
    const saved = await saveMockProgress({ id: mock.id, revision: 1, answers: [1], currentIndex: 0, itemElapsedMs: [9999] })
    expect(saved.ok).toBe(true)
    vi.setSystemTime(Date.parse(mock.deadlineAt))
    expect(await saveMockProgress({ id: mock.id, revision: 2, answers: [0], currentIndex: 0, itemElapsedMs: [10000] })).toMatchObject({ code: 'deadline-expired' })
    const result = await finalizeMock({ id: mock.id, revision: 2, answers: [0] })
    expect(result.result.answers[0]!.selectedIndex).toBe(1)
    expect(result.result.score).toBe(100)
  })

  it('validates backed-up result answer order and exposure metadata while retaining legacy results', async () => {
    const mock = await start()
    const { result } = await finalizeMock({ id: mock.id, revision: 1, answers: [1] })
    const payload = { version: 1, exportedAt: new Date().toISOString(), settings: defaultSettings(), mastery: defaultMastery(), cards: [], wrongAnswers: [], attempts: [], studyDays: [], mockResults: [result], activeSession: null, meta: { id: 'meta' } }
    expect(validateExportPayload(payload).ok).toBe(true)
    const broken = structuredClone(payload)
    broken.mockResults[0]!.questionSnapshots![0]!.choices = ['only one']
    expect(validateExportPayload(broken).ok).toBe(false)
    const mismatched = structuredClone(payload)
    mismatched.mockResults[0]!.answers[0]!.selectedIndex = 0
    expect(validateExportPayload(mismatched).ok).toBe(false)
    delete result.questionSnapshots
    expect(validateExportPayload(payload).ok).toBe(true)
  })
})
