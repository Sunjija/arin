import { describe, expect, it } from 'vitest'
import { buildWrongCardBack, buildWrongCardFront, resolveQuestionSource, snapshotFromQuestion } from './wrongCardContent'
import type { Question } from '../types'

const question: Question = {
  id: 'q-source',
  stem: '밑줄 친 제도를 시행한 왕은?',
  passage: '노비안검법을 실시하고 과거제를 도입하였다.',
  choices: ['태조', '광종', '성종', '공민왕', '충선왕'],
  answerIndex: 1,
  explanation: '광종의 왕권 강화 정책이다.',
  era: 'goryeo',
  tags: ['king-figure'],
  difficulty: 2,
  source: '자체 제작 학습문항',
  sourceUrl: '',
  license: '',
  imageRights: '',
}

describe('wrong card context', () => {
  it('puts passage and stem on the front so the card stands alone', () => {
    const snapshot = snapshotFromQuestion(question)
    expect(buildWrongCardFront(snapshot)).toContain('노비안검법')
    expect(buildWrongCardFront(snapshot)).toContain('밑줄 친 제도를 시행한 왕은?')
    expect(buildWrongCardBack(snapshot)).toContain('광종')
    expect(buildWrongCardBack(snapshot)).toContain('왕권 강화')
  })

  it('returns source-missing when the original question cannot be found', () => {
    expect(resolveQuestionSource({ questionId: 'missing-id' })).toBeNull()
  })
})
