import { describe, expect, it } from 'vitest'
import { updateMasteryScore } from './mastery'

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
