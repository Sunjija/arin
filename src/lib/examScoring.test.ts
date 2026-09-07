import { describe, expect, it } from 'vitest'
import { pickMockQuestions, scoreFromAnswers } from './examScoring'
import type { Question } from '../types'

function q(id: string, difficulty: Question['difficulty']): Question {
  return {
    id,
    stem: id,
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: '',
    era: 'goryeo',
    tags: ['chronology'],
    difficulty,
    source: '자체 제작 학습문항',
    sourceUrl: '',
    license: '',
    imageRights: '',
  }
}

describe('examScoring', () => {
  it('scales weighted score to 100', () => {
    const score = scoreFromAnswers([
      { correct: true, difficulty: 1 },
      { correct: true, difficulty: 2 },
      { correct: false, difficulty: 3 },
    ])
    // earned 3 / max 6 → 50
    expect(score).toBe(50)
  })

  it('can build a 50-question structure even when bank is smaller', () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3),
    )
    const picked = pickMockQuestions(pool, 50)
    expect(picked).toHaveLength(50)
    expect(new Set(picked.map((item) => item.id)).size).toBe(50)
  })

  it('keeps roughly 심화 2:6:2 point mix when bank is rich enough', () => {
    const pool = [
      ...Array.from({ length: 12 }, (_, i) => q(`e${i}`, 1)),
      ...Array.from({ length: 36 }, (_, i) => q(`m${i}`, 2)),
      ...Array.from({ length: 12 }, (_, i) => q(`h${i}`, 3)),
    ]
    const picked = pickMockQuestions(pool, 50)
    const counts = { 1: 0, 2: 0, 3: 0 }
    for (const item of picked) counts[item.difficulty] += 1
    expect(counts[1]).toBe(10)
    expect(counts[2]).toBe(30)
    expect(counts[3]).toBe(10)
  })
})
