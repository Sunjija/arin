import { describe, expect, it } from 'vitest'
import {
  difficultyDistribution,
  questions,
  validateQuestionBank,
} from '../data/questions'

describe('question bank quality', () => {
  it('has at least 80 items with 5 choices and valid answers', () => {
    expect(questions.length).toBeGreaterThanOrEqual(80)
    expect(validateQuestionBank()).toEqual([])
  })

  it('keeps roughly 심화 1:2:3 point mix (~20/60/20)', () => {
    const d = difficultyDistribution()
    const total = d[1] + d[2] + d[3]
    expect(d[1] / total).toBeGreaterThan(0.15)
    expect(d[1] / total).toBeLessThan(0.3)
    expect(d[2] / total).toBeGreaterThan(0.5)
    expect(d[3] / total).toBeGreaterThan(0.15)
    expect(d[3] / total).toBeLessThan(0.3)
  })

  it('covers all major eras at least once', () => {
    const eras = new Set(questions.map((q) => q.era))
    for (const era of [
      'prehistoric',
      'three-kingdoms',
      'north-south',
      'goryeo',
      'joseon-early',
      'joseon-late',
      'opening',
      'colonial',
      'modern',
      'culture',
    ]) {
      expect(eras.has(era as never)).toBe(true)
    }
  })

  it('includes many source/chronology/king items for 변별력', () => {
    const tags = questions.flatMap((q) => q.tags)
    expect(tags.filter((t) => t === 'chronology').length).toBeGreaterThanOrEqual(8)
    expect(tags.filter((t) => t === 'king-figure').length).toBeGreaterThanOrEqual(10)
    expect(tags.filter((t) => t === 'source').length).toBeGreaterThanOrEqual(10)
  })
})
