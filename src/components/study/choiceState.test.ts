import { describe, expect, it } from 'vitest'
import { choiceState } from './choiceState'

describe('choiceState', () => {
  it('marks selection before scoring and keeps unselected others', () => {
    expect(choiceState({ index: 1, selected: 1, revealed: false, answerIndex: 0 })).toBe('selected')
    expect(choiceState({ index: 0, selected: 1, revealed: false, answerIndex: 0 })).toBe(
      'unselected',
    )
  })

  it('labels scored answers without relying on color only', () => {
    expect(choiceState({ index: 0, selected: 2, revealed: true, answerIndex: 0 })).toBe('correct')
    expect(choiceState({ index: 2, selected: 2, revealed: true, answerIndex: 0 })).toBe('incorrect')
    expect(choiceState({ index: 1, selected: 2, revealed: true, answerIndex: 0 })).toBe('locked')
  })
})
