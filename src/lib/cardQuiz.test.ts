import { describe, expect, it } from 'vitest'
import { buildCardChoiceSet, ratingFromQuizResult } from './cardQuiz'
import type { FlashcardRecord } from '../types'

function card(partial: Partial<FlashcardRecord> & Pick<FlashcardRecord, 'id' | 'front' | 'back'>): FlashcardRecord {
  return {
    kind: 'king-to-deed',
    era: 'goryeo',
    tags: ['king-figure'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    nextReviewAt: '2026-01-01',
    intervalDays: 0,
    easeStreak: 0,
    lapses: 0,
    fingerprint: partial.id,
    ...partial,
  }
}

describe('buildCardChoiceSet', () => {
  it('creates 4 choices with exactly one correct answer and a concrete ask', () => {
    const target = card({ id: '1', front: '광종', back: '노비안검법' })
    const pool = [
      target,
      card({ id: '2', front: '성종', back: '12목 설치' }),
      card({ id: '3', front: '태종', back: '사병 혁파' }),
      card({ id: '4', front: '세종', back: '훈민정음' }),
      card({ id: '5', front: '대조영', back: '발해 건국' }),
    ]
    const set = buildCardChoiceSet(target, pool, () => 0.2)
    expect(set.choices).toHaveLength(4)
    expect(set.choices[set.answerIndex]).toBe('노비안검법')
    expect(new Set(set.choices).size).toBe(4)
    expect(set.ask).toContain('업적')
    expect(set.kindLabel).toBe('왕 → 업적')
    expect(set.prompt).toBe('광종')
  })
})

describe('ratingFromQuizResult', () => {
  it('maps wrong to again and fast correct to easy', () => {
    expect(ratingFromQuizResult(false, 1000)).toBe('again')
    expect(ratingFromQuizResult(true, 2000)).toBe('easy')
    expect(ratingFromQuizResult(true, 7000)).toBe('good')
    expect(ratingFromQuizResult(true, 12000)).toBe('hard')
  })
})
