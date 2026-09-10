import { describe, expect, it } from 'vitest'
import { cardPrompt } from './cardPrompt'
import { flashcardSeeds } from '../data/cards'

describe('card questions', () => {
  it('asks for a specific answer for every built-in concept', () => {
    for (const card of flashcardSeeds.filter((card) => card.kind === 'concept')) {
      const prompt = cardPrompt(card)
      expect(prompt.question, card.id).not.toBe(card.front)
      expect(prompt.question).not.toContain('개념을 설명')
      expect(prompt.answer).toBe(card.back)
    }
  })
  it('hides the final event until revealing an ordered sequence', () => {
    const prompt = cardPrompt({ front: '사건 A → 사건 B', back: '순서', kind: 'chronology' })
    expect(prompt.question).not.toContain('사건 B')
    expect(prompt.answer).toContain('사건 B')
  })
  it('preserves custom and wrong-answer questions', () => {
    const card = { front: '다음 중 옳은 것은?\n① 보기', back: '정답', kind: 'concept' as const }
    expect(cardPrompt(card).question).toBe(card.front)
  })
})
