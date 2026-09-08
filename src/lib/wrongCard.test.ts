import { describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import { cardFingerprint } from './cardFingerprint'
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

  it('keeps the passage on q-01 and q-05 and stays stem-only when there is none', () => {
    const q01 = questions.find((item) => item.id === 'q-01')
    const q05 = questions.find((item) => item.id === 'q-05')
    const q03 = questions.find((item) => item.id === 'q-03')
    expect(q01?.passage).toBeTruthy()
    expect(q05?.passage).toBeTruthy()
    expect(q03?.passage).toBeFalsy()
    const front01 = buildWrongCardFront(snapshotFromQuestion(q01!))
    const front05 = buildWrongCardFront(snapshotFromQuestion(q05!))
    const front03 = buildWrongCardFront(snapshotFromQuestion(q03!))
    expect(front01).toContain('기하학적 무늬')
    expect(front01).toContain('밑줄 친 ㉠이 가리키는 시기')
    expect(front05).toContain('장수왕이 평양으로 천도')
    expect(front05).toContain('(가)~(다)를 일어난 순서대로')
    expect(front03).toBe(q03!.stem)
    expect(front03).not.toContain('\n\n')
    expect(cardFingerprint(front01, buildWrongCardBack(snapshotFromQuestion(q01!)))).not.toBe(
      cardFingerprint(q01!.stem, buildWrongCardBack(snapshotFromQuestion(q01!))),
    )
  })
})
