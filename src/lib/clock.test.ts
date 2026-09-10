import { afterEach, describe, expect, it } from 'vitest'
import { resetClock, setClockToDate, todayKey } from './clock'
import { LEARNING_TIMEZONE_POLICY } from './clock'

describe('clock', () => {
  afterEach(() => {
    resetClock()
  })

  it('날짜만 넣으면 로컬 달력 날짜를 학습일로 쓴다', () => {
    setClockToDate('2026-09-15')
    expect(todayKey()).toBe('2026-09-15')
    expect(LEARNING_TIMEZONE_POLICY.boundary).toBe('local-midnight')
  })
})
