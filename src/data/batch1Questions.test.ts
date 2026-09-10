import { describe, expect, it } from 'vitest'
import { BATCH1_QUESTION_IDS, BATCH1_QUESTIONS } from './batch1Questions'
import { questions } from './questions'
import { isHumanApproved } from '../lib/questionReview'

describe('batch 1 question rewrites', () => {
  it('covers the sample 10 and keeps them in-review, not approved', () => {
    expect(BATCH1_QUESTIONS.map((question) => question.id)).toEqual([...BATCH1_QUESTION_IDS])
    for (const id of BATCH1_QUESTION_IDS) {
      const question = questions.find((item) => item.id === id)
      expect(question, id).toBeDefined()
      expect(question?.reviewStatus).toBe('in-review')
      expect(question?.contentVersion).toBe(2)
      expect(question?.stimulus).toBeDefined()
      expect(question?.stimulus?.authenticity).toBe('reconstructed')
      expect(question?.visualRequired).toBe(false)
      expect(isHumanApproved(question!)).toBe(false)
      expect(question?.explanation).toContain('핵심 단서')
      expect(question?.explanation).toContain('정답 근거')
      expect(question?.explanation).toContain('오답')
      expect(question?.explanation).toContain('연결 개념')
    }
  })

  it('does not name the answer target in the weakest stems', () => {
    const q57 = questions.find((question) => question.id === 'q-57')
    const q27 = questions.find((question) => question.id === 'q-27')
    const q99 = questions.find((question) => question.id === 'q-99')
    expect(q57?.stem).not.toContain('한인애국단')
    expect(q27?.stem).not.toContain('을사')
    expect(q99?.stem).not.toContain('무단')
    expect(q99?.stimulus?.kind).toBe('table')
  })

  it('keeps chronology choice order and uses same-era colonial distractors for q-96', () => {
    const q55 = questions.find((question) => question.id === 'q-55')
    const q86 = questions.find((question) => question.id === 'q-86')
    const q96 = questions.find((question) => question.id === 'q-96')
    expect(q55?.choiceOrder).toBe('keep')
    expect(q86?.choiceOrder).toBe('keep')
    expect(new Set(q96?.choices)).toEqual(
      new Set(['조선어 학회', '조선어 연구회', '신간회', '진단학회', '물산 장려회']),
    )
    expect(q96?.choices[q96.answerIndex]).toBe('조선어 학회')
  })
})
