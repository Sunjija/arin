import { describe, expect, it } from 'vitest'
import { createInitialMastery, observedWeakAreas, updateMasteryScore } from './mastery'
import type { AttemptRecord } from '../types'
import { ALL_ERAS, ALL_TYPES } from '../types'

describe('updateMasteryScore', () => {
  it('정답이면 상승, 오답이면 하락', () => {
    const up = updateMasteryScore({
      current: 40,
      correct: true,
      responseMs: 5000,
      daysAgo: 0,
    })
    const down = updateMasteryScore({
      current: 40,
      correct: false,
      responseMs: 5000,
      daysAgo: 0,
      cause: 'confused-person',
    })
    expect(up).toBeGreaterThan(40)
    expect(down).toBeLessThan(40)
  })

  it('느린 응답과 오래된 시도는 반영이 약해짐', () => {
    const fast = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: 3000,
      daysAgo: 0,
    })
    const slow = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: 40_000,
      daysAgo: 0,
    })
    const old = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: 3000,
      daysAgo: 7,
    })
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBeGreaterThan(old)
  })

  it('null 풀이 시간에는 속도 불이익을 주지 않는다', () => {
    const measuredFast = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: 3000,
      daysAgo: 0,
    })
    const unknown = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: null,
      daysAgo: 0,
    })
    const slow = updateMasteryScore({
      current: 50,
      correct: true,
      responseMs: 40_000,
      daysAgo: 0,
    })
    expect(unknown).toBe(measuredFast)
    expect(unknown).toBeGreaterThan(slow)
  })

  it('0~100으로 클램프', () => {
    expect(
      updateMasteryScore({ current: 99, correct: true, responseMs: 1000, daysAgo: 0 }),
    ).toBeLessThanOrEqual(100)
    expect(
      updateMasteryScore({
        current: 1,
        correct: false,
        responseMs: 1000,
        daysAgo: 0,
        cause: 'confused-order',
      }),
    ).toBeGreaterThanOrEqual(0)
  })
})

describe('observed mastery', () => {
  it('does not treat the internal starter as a user diagnosis', () => {
    const initial = createInitialMastery(ALL_ERAS, ALL_TYPES, 50)
    expect(initial.eras.goryeo).toBe(50)
    expect(initial.types.chronology).toBe(50)
    expect(observedWeakAreas([])).toEqual([])
  })

  it('marks areas unmeasured until enough attempts exist', () => {
    const attempts: AttemptRecord[] = [
      {
        id: '1',
        questionId: 'q',
        correct: false,
        selectedIndex: 1,
        responseMs: 1000,
        era: 'goryeo',
        tags: ['king-figure'],
        createdAt: '2026-01-01T00:00:00.000Z',
        source: 'practice',
      },
    ]
    expect(observedWeakAreas(attempts, 3)).toEqual([])
  })
})
