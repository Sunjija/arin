import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActiveMock, MockExamResult, QuestionSnapshot } from '../../types'
import { buildScoreSummary } from '../../lib/scoreSummary'
import {
  applyChoice,
  createAnswerBuffer,
  createProgressSaver,
  createSubmitOnce,
  existingProgressCopy,
  finalizePayload,
  formatRemaining,
  fullMockAverageFromSummary,
  missedReviewIndexes,
  nextAction,
  recentMocksForDisplay,
  remainingMs,
  resolveActiveMockAction,
  resumeState,
  reviewFromSnapshot,
  snapshotForAutoSubmit,
  shouldFinalizeByDeadline,
  unansweredNumbers,
} from './mockExamLogic'

function snap(id: string, extras?: Partial<QuestionSnapshot>): QuestionSnapshot {
  return {
    questionId: id,
    stem: `stem-${id}`,
    passage: `passage-${id}`,
    choices: ['가', '나', '다', '라', '마'],
    answerIndex: 1,
    explanation: `explain-${id}`,
    era: 'goryeo',
    tags: ['chronology'],
    difficulty: 2,
    ...extras,
  }
}

function activeMock(overrides: Partial<ActiveMock> = {}): ActiveMock {
  const snapshots = [snap('q1'), snap('q2'), snap('q3')]
  return {
    id: 'mock-1',
    revision: 3,
    mode: 'sample',
    status: 'in-progress',
    questionSnapshots: snapshots,
    answers: [0, null, null],
    itemElapsedMs: [1200, null, null],
    currentIndex: 1,
    startedAt: '2026-09-08T00:00:00.000Z',
    deadlineAt: '2026-09-08T00:16:00.000Z',
    updatedAt: '2026-09-08T00:01:00.000Z',
    ...overrides,
  }
}

function mockResult(overrides: Partial<MockExamResult> & Pick<MockExamResult, 'id' | 'mode' | 'score' | 'total'>): MockExamResult {
  return {
    createdAt: '2026-09-08T00:00:00.000Z',
    correct: 0,
    durationSec: 10,
    answers: Array.from({ length: overrides.total }, (_, i) => ({
      questionId: `q-${i}`,
      selectedIndex: 0 as number | null,
      correct: true,
    })),
    byEra: {},
    byType: {},
    ...overrides,
  }
}

function fullFifty(id: string, score: number): MockExamResult {
  let remaining = score
  const questionSnapshots = Array.from({ length: 50 }, (_, i) => ({
    questionId: `orig-${i}`, stem: 'original', choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0, explanation: '', era: 'goryeo' as const, tags: [],
    difficulty: (i < 10 ? 3 : i < 40 ? 2 : 1) as 1 | 2 | 3,
  }))
  const answers = questionSnapshots.map(snapshot => {
    const correct = remaining >= snapshot.difficulty
    if (correct) remaining -= snapshot.difficulty
    return { questionId: snapshot.questionId, selectedIndex: correct ? 0 : 1, correct }
  })
  return mockResult({ id, mode: 'full', score, total: 50, questionSnapshots, answers,
    correct: answers.filter(answer => answer.correct).length })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('mock exam clock and answers', () => {
  it('keeps the last-second answer when the deadline fires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:15:59.000Z'))
    const deadlineAt = '2026-09-08T00:16:00.000Z'
    const buffer = createAnswerBuffer([null, null, 1])
    buffer.select(0, 4)
    expect(shouldFinalizeByDeadline(deadlineAt, Date.now())).toBe(false)

    vi.setSystemTime(new Date('2026-09-08T00:16:00.000Z'))
    expect(shouldFinalizeByDeadline(deadlineAt, Date.now())).toBe(true)
    expect(remainingMs(deadlineAt, Date.now())).toBe(0)
    expect(
      snapshotForAutoSubmit({
        id: 'mock-1',
        revision: 4,
        getAnswers: () => buffer.get(),
        getItemElapsedMs: () => [null, null, null],
      }).answers,
    ).toEqual([4, null, 1])
  })

  it('does not reset the deadline when a later answer is chosen', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
    const deadlineAt = '2026-09-08T00:16:00.000Z'
    const buffer = createAnswerBuffer([null, null])
    const remainingBefore = remainingMs(deadlineAt, Date.now())
    buffer.select(0, 2)
    buffer.select(1, 3)
    expect(remainingMs(deadlineAt, Date.now())).toBe(remainingBefore)
    vi.advanceTimersByTime(5_000)
    expect(remainingMs(deadlineAt, Date.now())).toBe(remainingBefore - 5_000)
    expect(buffer.get()).toEqual([2, 3])
  })

  it('formats remaining time from deadlineAt - now without ticking aria text helpers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
    expect(formatRemaining(remainingMs('2026-09-08T01:20:00.000Z', Date.now()))).toBe('1:20:00')
    vi.advanceTimersByTime(1000)
    expect(formatRemaining(remainingMs('2026-09-08T01:20:00.000Z', Date.now()))).toBe('1:19:59')
  })

  it('lists unanswered numbers for jump navigation', () => {
    expect(unansweredNumbers([0, null, 2, null])).toEqual([2, 4])
    expect(applyChoice([null, null], 1, 3)).toEqual([null, 3])
  })

  it('uses the latest index when deciding confirm vs next', () => {
    expect(nextAction(8, 10)).toEqual({ index: 9 })
    expect(nextAction(9, 10)).toBe('confirm')
  })
})

describe('submit once', () => {
  it('runs finalize only once when submit is invoked twice', async () => {
    const lock = createSubmitOnce()
    let calls = 0
    const finalize = async () => {
      calls += 1
      return { id: 'mock-1' }
    }
    const first = lock.run(finalize)
    const second = lock.run(finalize)
    const [a, b] = await Promise.all([first, second])
    expect(a).toEqual({ status: 'ran', value: { id: 'mock-1' } })
    expect(b).toEqual({ status: 'skipped' })
    expect(calls).toBe(1)
    await expect(lock.run(finalize)).resolves.toEqual({ status: 'skipped' })
    expect(calls).toBe(1)
  })
})

describe('refresh restore', () => {
  it('resumes in-progress answers from getActiveMock shape', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:10:00.000Z'))
    const mock = activeMock()
    expect(resolveActiveMockAction(mock, Date.now())).toEqual({ type: 'resume', mock })
    expect(resumeState(mock)).toMatchObject({
      answers: [0, null, null],
      currentIndex: 1,
      itemElapsedMs: [1200, null, null],
      revision: 3,
    })
    expect(existingProgressCopy(mock)).toContain('10문항 연습')
    expect(existingProgressCopy(mock)).toContain('미응답 2문항')
  })

  it('finalizes with the saved answers when returning after the deadline', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:16:01.000Z'))
    const mock = activeMock({ answers: [2, 1, null] })
    const action = resolveActiveMockAction(mock, Date.now())
    expect(action.type).toBe('finalize-expired')
    if (action.type !== 'finalize-expired') return
    expect(
      finalizePayload({
        id: action.mock.id,
        revision: action.mock.revision,
        answers: action.mock.answers,
        itemElapsedMs: action.mock.itemElapsedMs,
      }).answers,
    ).toEqual([2, 1, null])
  })
})

describe('score summary display', () => {
  it('does not let sample mocks into the full-mock average', () => {
    const sample = mockResult({ id: 'sample-1', mode: 'sample', score: 100, total: 10 })
    const full = fullFifty('full-1', 70)
    const summary = buildScoreSummary({
      attempts: [],
      mockResultsNewestFirst: [sample, full],
      goalScore: 85,
    })
    expect(fullMockAverageFromSummary(summary)).toBe(70)
    expect(summary.recentMocks.some((item) => item.mode === 'sample' && item.eligibleForFullStats)).toBe(
      false,
    )
  })

  it('does not double-count the just-finished result on top of recentMocks', () => {
    const current = fullFifty('full-now', 90)
    const older = fullFifty('full-old', 80)
    const summary = buildScoreSummary({
      attempts: [],
      mockResultsNewestFirst: [current, older],
      goalScore: 85,
    })
    const displayed = recentMocksForDisplay(summary)
    expect(displayed.filter((item) => item.id === current.id)).toHaveLength(1)
    expect(displayed.map((item) => item.score)).toEqual([90, 80])
    expect([current.score, ...displayed.map((item) => item.score)]).not.toEqual(
      displayed.map((item) => item.score),
    )
  })
})

describe('snapshot review', () => {
  it('restores passage, selection, answer, and explanation from the snapshot', () => {
    const snapshot = snap('frozen', {
      stem: '원문 줄기',
      passage: '원문 지문',
      choices: ['서울', '개경', '평양', '경주', '부여'],
      answerIndex: 1,
      explanation: '원문 해설',
    })
    const liveChanged = { ...snapshot, stem: '라이브 줄기', passage: '라이브 지문' }
    const review = reviewFromSnapshot(snapshot, 0)
    expect(review.stem).toBe('원문 줄기')
    expect(review.passage).toBe('원문 지문')
    expect(review.choices[review.answerIndex]).toBe('개경')
    expect(review.choices[review.selectedIndex ?? -1]).toBe('서울')
    expect(review.explanation).toBe('원문 해설')
    expect(review.correct).toBe(false)
    expect(review.stem).not.toBe(liveChanged.stem)
    expect(missedReviewIndexes([snapshot], [0])).toEqual([0])
    expect(missedReviewIndexes([snapshot], [1])).toEqual([])
  })
})

describe('save retry', () => {
  it('keeps an exhausted save failure visible to flush and allows explicit retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValue({ ok: true, mock: activeMock({ revision: 4 }) })
    const saver = createProgressSaver(save, { maxRetries: 0 })
    const draft = { id: 'mock-1', answers: [1, null, null], currentIndex: 0, itemElapsedMs: [null, null, null] }
    await saver.enqueue(draft)
    await expect(saver.flush()).rejects.toThrow('quota')
    await saver.enqueue(draft)
    await expect(saver.flush()).resolves.toBeUndefined()
    expect(save.mock.calls[1]![0].answers).toEqual(draft.answers)
  })

  it('does not rebase a stale whole answer array over another tab', async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, code: 'stale-revision', mock: activeMock({ revision: 5 }) })
    const saver = createProgressSaver(save)
    const draft = { id: 'mock-1', answers: [1, null, null], currentIndex: 0, itemElapsedMs: [null, null, null] }
    await saver.enqueue(draft)
    await expect(saver.flush()).rejects.toThrow('다른 창')
    await saver.enqueue(draft)
    expect(save).toHaveBeenCalledTimes(1)
  })
  it('retries a failed save and then succeeds', async () => {
    vi.useFakeTimers()
    let calls = 0
    const save = vi.fn(async () => {
      calls += 1
      if (calls < 3) throw new Error('network')
      return {
        ok: true as const,
        mock: activeMock({ revision: 4 }),
      }
    })
    const saver = createProgressSaver(save, { retryDelayMs: 200, maxRetries: 3 })
    const pending = saver.enqueue({
      id: 'mock-1',
      answers: [1, null, null],
      currentIndex: 0,
      itemElapsedMs: [null, null, null],
    })
    await vi.advanceTimersByTimeAsync(200)
    await vi.advanceTimersByTimeAsync(400)
    await pending
    expect(calls).toBe(3)
    expect(saver.getRevision()).toBe(4)
    expect(saver.getError()).toBeNull()
  })
})
