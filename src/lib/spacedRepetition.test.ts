import { describe, expect, it } from 'vitest'
import { calculateNextInterval, MAX_INTERVAL } from './spacedRepetition'

describe('calculateNextInterval', () => {
  it('모름은 1일, 헷갈림은 3일, 연속 배율 리셋', () => {
    expect(calculateNextInterval('again', { intervalDays: 14, easeStreak: 3 })).toEqual({
      intervalDays: 1,
      easeStreak: 0,
      nextIntervalDays: 1,
    })
    expect(calculateNextInterval('hard', { intervalDays: 14, easeStreak: 2 }).nextIntervalDays).toBe(3)
  })

  it('맞음/너무 쉬움 기본 간격과 연속 2배, 최대 60일', () => {
    const first = calculateNextInterval('good', { intervalDays: 0, easeStreak: 0 })
    expect(first.nextIntervalDays).toBe(7)
    const second = calculateNextInterval('good', {
      intervalDays: first.nextIntervalDays,
      easeStreak: first.easeStreak,
    })
    expect(second.nextIntervalDays).toBe(14)

    const easy = calculateNextInterval('easy', { intervalDays: 40, easeStreak: 3 })
    expect(easy.nextIntervalDays).toBe(MAX_INTERVAL)
  })
})
