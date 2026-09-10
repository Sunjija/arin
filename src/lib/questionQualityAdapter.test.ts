import { describe, expect, it } from 'vitest'
import { classifyQuestionUse } from './questionQualityAdapter'
import type { Question } from '../types'

const sample: Question = {
  id: 'q-ok',
  stem: '다음 설명에 해당하는 것은?',
  choices: ['가', '나', '다', '라', '마'],
  answerIndex: 0,
  explanation: '설명',
  era: 'goryeo',
  tags: ['source'],
  difficulty: 2,
  source: '자체 제작 학습문항',
  sourceUrl: '',
  license: 'x',
  imageRights: 'x',
  lessonId: 'lesson-04',
}

describe('questionQualityAdapter', () => {
  it('사람 검수 필드가 없으면 연습은 가능해도 실전 승인은 아니다', () => {
    const cls = classifyQuestionUse(sample, [])
    expect(cls.practiceOk).toBe(true)
    expect(cls.examApproved).toBe(false)
    expect(cls.diagnosticOk).toBe(false)
  })
})
