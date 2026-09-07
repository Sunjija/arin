import { describe, expect, it } from 'vitest'
import {
  consecutiveAboveThreshold,
  estimateScoreFromMocks,
  isStableZone,
} from './scoreEstimate'
import { scoreFromAnswers } from './examScoring'

describe('estimateScoreFromMocks', () => {
  it('최근 시험에 더 높은 가중치를 준다', () => {
    // newest first: 90, 80, 70 → (90*3 + 80*2 + 70*1) / 6 = 83.33 → 83
    expect(estimateScoreFromMocks([90, 80, 70])).toBe(83)
    expect(estimateScoreFromMocks([])).toBeNull()
  })
})

describe('stable zone', () => {
  it('85점 이상 3회 연속이면 안정권', () => {
    expect(isStableZone([90, 88, 85])).toBe(true)
    expect(isStableZone([90, 80, 88])).toBe(false)
    expect(consecutiveAboveThreshold([92, 86, 70])).toBe(2)
  })
})

describe('exam scoring', () => {
  it('배점 합으로 100점 환산', () => {
    const score = scoreFromAnswers([
      { correct: true, difficulty: 1 },
      { correct: true, difficulty: 2 },
      { correct: false, difficulty: 3 },
    ])
    // earned 3 / max 6 → 50
    expect(score).toBe(50)
  })
})
