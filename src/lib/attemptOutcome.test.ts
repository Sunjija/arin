import { describe, expect, it } from 'vitest'
import { classifyAttemptOutcome, isTransferEvidence } from './attemptOutcome'

describe('classifyAttemptOutcome', () => {
  it('처음 보는 문제를 맞히면 first-correct', () => {
    expect(classifyAttemptOutcome({ correct: true, previousAttemptCount: 0 })).toBe('first-correct')
  })

  it('전에 본 문제를 다시 맞히면 repeat-correct', () => {
    expect(classifyAttemptOutcome({ correct: true, previousAttemptCount: 2 })).toBe('repeat-correct')
  })

  it('해설을 본 뒤 맞히면 after-help-correct', () => {
    expect(
      classifyAttemptOutcome({ correct: true, previousAttemptCount: 0, sawExplanation: true }),
    ).toBe('after-help-correct')
  })

  it('확신 없이 맞히면 unsure-correct', () => {
    expect(
      classifyAttemptOutcome({ correct: true, previousAttemptCount: 0, confidence: 'unsure' }),
    ).toBe('unsure-correct')
  })

  it('진단은 실력으로 채점하지 않는다', () => {
    expect(
      classifyAttemptOutcome({ correct: true, previousAttemptCount: 0, source: 'diagnostic' }),
    ).toBe('unscored')
  })

  it('같은 문항 반복 정답은 적용 증거가 아니다', () => {
    expect(isTransferEvidence('repeat-correct')).toBe(false)
    expect(isTransferEvidence('first-correct')).toBe(true)
  })
})
