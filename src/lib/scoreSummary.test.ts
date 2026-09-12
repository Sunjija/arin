import { describe, expect, it } from 'vitest'
import type { AttemptRecord, MockExamResult } from '../types'
import {
  averageEligibleFullMocks,
  buildScoreSummary,
  consecutiveGoalHits,
  estimatedScoreFromRecords,
  evaluateFullMockEligibility,
  isConsecutiveGoalStable,
} from './scoreSummary'

function mockResult(overrides: Partial<MockExamResult> & Pick<MockExamResult, 'id' | 'mode' | 'score' | 'total'>): MockExamResult {
  const answers = Array.from({ length: overrides.total }, (_, i) => ({
    questionId: `q-${i}`,
    selectedIndex: 0 as number | null,
    correct: true,
  }))
  return {
    createdAt: '2026-09-01T00:00:00.000Z',
    correct: overrides.total,
    durationSec: 100,
    answers,
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

describe('full mock eligibility', () => {
  it('fails closed for legacy, oversized, tampered and non-100-point results', () => {
    const original = fullFifty('valid', 80)
    expect(evaluateFullMockEligibility({ ...original, questionSnapshots: undefined }).eligible).toBe(false)
    expect(evaluateFullMockEligibility({ ...original, score: 90 }).eligible).toBe(false)
    expect(evaluateFullMockEligibility({ ...original, total: 51, answers: [...original.answers, { questionId: 'extra', selectedIndex: 0, correct: true }] }).eligible).toBe(false)
    const points = structuredClone(original)
    points.questionSnapshots![0]!.difficulty = 2
    expect(evaluateFullMockEligibility(points).eligible).toBe(false)
  })
  it('rejects sample, padded, and short unique sets', () => {
    expect(evaluateFullMockEligibility(mockResult({ id: 's', mode: 'sample', score: 100, total: 10 })).eligible).toBe(
      false,
    )
    expect(
      evaluateFullMockEligibility(
        mockResult({
          id: 'p',
          mode: 'full',
          score: 90,
          total: 50,
          answers: Array.from({ length: 50 }, (_, i) => ({
            questionId: i < 40 ? `orig-${i}` : `orig-1__pad${i}`,
            selectedIndex: 0,
            correct: true,
          })),
        }),
      ).eligible,
    ).toBe(false)
    expect(evaluateFullMockEligibility(mockResult({ id: 'short', mode: 'full', score: 80, total: 10 })).eligible).toBe(
      false,
    )
  })

  it('accepts 50 unique original full results', () => {
    expect(evaluateFullMockEligibility(fullFifty('a', 88)).eligible).toBe(true)
  })
})

describe('buildScoreSummary', () => {
  it('uses null when nothing is measured', () => {
    const summary = buildScoreSummary({ attempts: [], mockResultsNewestFirst: [], goalScore: 85 })
    expect(summary.practiceAccuracy).toBeNull()
    expect(summary.practiceAttemptCount).toBe(0)
    expect(summary.fullMockAverage).toBeNull()
    expect(summary.eligibleFullMockCount).toBe(0)
    expect(summary.consecutiveGoalHits).toBe(0)
  })

  it('keeps practice accuracy separate from sample mocks', () => {
    const attempts: AttemptRecord[] = [
      attempt('practice', true),
      attempt('practice', false),
      attempt('mock', true),
    ]
    const samples = [90, 100, 95].map((score, i) =>
      mockResult({ id: `sample-${i}`, mode: 'sample', score, total: 10 }),
    )
    const summary = buildScoreSummary({
      attempts,
      mockResultsNewestFirst: samples,
      goalScore: 85,
    })
    expect(summary.practiceAccuracy).toBe(50)
    expect(summary.practiceAttemptCount).toBe(2)
    expect(summary.fullMockAverage).toBeNull()
    expect(summary.consecutiveGoalHits).toBe(0)
  })

  it('averages the latest 3 eligible full results equally and ignores duplicates', () => {
    const newestFirst = [
      fullFifty('a', 90),
      fullFifty('a', 90),
      fullFifty('b', 80),
      fullFifty('c', 70),
      fullFifty('d', 60),
    ]
    expect(averageEligibleFullMocks(newestFirst)).toBe(80)
    expect(consecutiveGoalHits(newestFirst, 85)).toBe(1)
    expect(consecutiveGoalHits(newestFirst, 60)).toBe(4)
    expect(consecutiveGoalHits([fullFifty('x', 100), fullFifty('y', 100), fullFifty('z', 100)], 85)).toBe(3)
  })

  it('needs three consecutive goal hits for the stable zone and a miss breaks the streak', () => {
    expect(consecutiveGoalHits([fullFifty('a', 100), fullFifty('b', 90)], 85)).toBe(2)
    expect(isConsecutiveGoalStable(2)).toBe(false)
    expect(isConsecutiveGoalStable(consecutiveGoalHits([
      fullFifty('a', 100),
      fullFifty('b', 100),
      fullFifty('c', 100),
    ], 85))).toBe(true)
    expect(consecutiveGoalHits([
      fullFifty('now', 100),
      fullFifty('mid', 70),
      fullFifty('old', 100),
    ], 85)).toBe(1)
  })

  it('does not count the same result id twice when judging consecutive hits', () => {
    const current = fullFifty('full-now', 100)
    expect(
      consecutiveGoalHits([current, current, fullFifty('older', 90)], 85),
    ).toBe(2)
    expect(isConsecutiveGoalStable(2)).toBe(false)
  })
})

describe('estimatedScoreFromRecords', () => {
  it('uses the same recent-40 window so home and progress cannot diverge', () => {
    const olderWrong = Array.from({ length: 40 }, (_, i) =>
      attemptAt(`old-${i}`, false, `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`),
    )
    const recentCorrect = Array.from({ length: 40 }, (_, i) =>
      attemptAt(`new-${i}`, true, `2026-02-01T00:00:${String(i).padStart(2, '0')}.000Z`),
    )
    const attempts = [...olderWrong, ...recentCorrect]
    expect(estimatedScoreFromRecords({ attempts, mockResultsNewestFirst: [] })).toBe(100)
    expect(
      Math.round((attempts.filter((row) => row.correct).length / attempts.length) * 100),
    ).toBe(50)
  })

  it('prefers eligible full mocks over the practice window', () => {
    const recentCorrect = Array.from({ length: 40 }, (_, i) =>
      attemptAt(`new-${i}`, true, `2026-02-01T00:00:${String(i).padStart(2, '0')}.000Z`),
    )
    expect(
      estimatedScoreFromRecords({
        attempts: recentCorrect,
        mockResultsNewestFirst: [fullFifty('full-1', 70)],
      }),
    ).toBe(70)
  })
})

function attempt(source: 'practice' | 'mock', correct: boolean): AttemptRecord {
  return {
    id: `att-${source}-${correct ? 'c' : 'w'}-${Math.random()}`,
    questionId: 'q1',
    correct,
    selectedIndex: 0,
    responseMs: 4000,
    era: 'goryeo',
    tags: ['king-figure'],
    createdAt: '2026-09-01T00:00:00.000Z',
    source,
  }
}

function attemptAt(id: string, correct: boolean, createdAt: string): AttemptRecord {
  return {
    id,
    questionId: 'q1',
    correct,
    selectedIndex: 0,
    responseMs: 4000,
    era: 'goryeo',
    tags: ['king-figure'],
    createdAt,
    source: 'practice',
  }
}
