import { describe, expect, it } from 'vitest'
import { inspectFullMockPool, uniqueOriginalQuestionCount } from './mockEligibility'
import type { QuestionSnapshot } from '../types'

function snap(id: string): QuestionSnapshot {
  return {
    questionId: id,
    stem: id,
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: '',
    era: 'goryeo',
    tags: ['chronology'],
    difficulty: 2,
  }
}

describe('full mock pool inspection', () => {
  it('rejects padded copies and short unique sets', () => {
    const padded = Array.from({ length: 50 }, (_, i) => snap(i < 40 ? `q-${i}` : `q-1__pad${i}`))
    expect(inspectFullMockPool(padded).ok).toBe(false)
    expect(uniqueOriginalQuestionCount(padded)).toBeLessThan(50)

    const short = Array.from({ length: 12 }, (_, i) => snap(`q-${i}`))
    expect(inspectFullMockPool(short).ok).toBe(false)
  })

  it('accepts 50 unique original items', () => {
    const pool = Array.from({ length: 50 }, (_, i) => snap(`q-${i}`))
    expect(inspectFullMockPool(pool)).toEqual({ ok: true, uniqueCount: 50 })
  })
})
