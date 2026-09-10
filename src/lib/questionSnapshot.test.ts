import { describe, expect, it } from 'vitest'
import { freezeAttemptSnapshot, gradeAgainstSnapshot, resolveAttemptQuestion } from './questionSnapshot'
import type { Question } from '../types'

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-x',
    stem: 'old stem',
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 1,
    explanation: 'old expl',
    era: 'goryeo',
    tags: ['source'],
    difficulty: 2,
    source: '자체 제작 학습문항',
    sourceUrl: '',
    license: 'x',
    imageRights: 'x',
    ...overrides,
  }
}

describe('questionSnapshot', () => {
  it('콘텐츠가 바뀌어도 당시 선지·정답으로 채점한다', () => {
    const snapshot = freezeAttemptSnapshot(question(), '2026-01-01T00:00:00.000Z')
    const updated = question({
      stem: 'new stem',
      choices: ['z', 'y', 'x', 'w', 'v'],
      answerIndex: 0,
      explanation: 'new expl',
    })
    const resolved = resolveAttemptQuestion(snapshot, updated)
    expect(resolved?.fromSnapshot).toBe(true)
    expect(resolved?.choices).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(gradeAgainstSnapshot(1, snapshot)).toBe(true)
    expect(gradeAgainstSnapshot(0, snapshot)).toBe(false)
  })
})
