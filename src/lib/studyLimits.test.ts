import { describe, expect, it } from 'vitest'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS, normalizeDailyCardCount } from './studyLimits'

describe('daily card study limits', () => {
  it('keeps each session between 3 and 15 cards', () => {
    expect(normalizeDailyCardCount(1)).toBe(MIN_DAILY_CARDS)
    expect(normalizeDailyCardCount(10)).toBe(10)
    expect(normalizeDailyCardCount(45)).toBe(MAX_DAILY_CARDS)
  })
})
