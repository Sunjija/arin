import { describe, expect, it } from 'vitest'
import { deriveConceptProgress } from './conceptProgress'
import { TOPIC_CATALOG } from '../data/topicCatalog'
import type { AttemptRecord, Question } from '../types'

function q(id: string): Question {
  return {
    id,
    stem: '대동법',
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: '공납',
    era: 'joseon-late',
    tags: ['political-system'],
    difficulty: 2,
    source: 'x',
    sourceUrl: '',
    license: 'x',
    imageRights: 'x',
    lessonId: 'lesson-07',
    formatId: 'policy-name',
  }
}

describe('deriveConceptProgress', () => {
  it('같은 문항 반복 정답만으로 applied가 되지 않는다', () => {
    const question = q('q-tax-1')
    const attempts: AttemptRecord[] = [1, 2, 3].map((n) => ({
      id: `a${n}`,
      questionId: question.id,
      correct: true,
      selectedIndex: 0,
      responseMs: 1000,
      era: question.era,
      tags: question.tags,
      createdAt: `2026-09-0${n}T00:00:00.000Z`,
      source: 'practice',
      outcomeKind: n === 1 ? 'first-correct' : 'repeat-correct',
      questionSnapshot: {
        questionId: question.id,
        stem: question.stem,
        choices: question.choices,
        answerIndex: 0,
        explanation: question.explanation,
        formatId: question.formatId,
        lessonId: question.lessonId,
        era: question.era,
        tags: question.tags,
        capturedAt: `2026-09-0${n}T00:00:00.000Z`,
      },
    }))
    const progress = deriveConceptProgress({
      questions: [question],
      attempts,
      cards: [],
      topics: TOPIC_CATALOG,
      completedLessonIds: ['lesson-07'],
    })
    const tax = progress.find((row) => row.title.includes('대동'))
    expect(tax?.memory).not.toBe('applied')
  })

  it('여러 개념 문항의 오답을 전부 미숙으로 내리지 않는다', () => {
    const multi: Question = {
      ...q('q-multi'),
      stem: '대동법과 균역법',
      explanation: '대동법 공납 균역법 군포',
      lessonId: 'lesson-07',
    }
    const progress = deriveConceptProgress({
      questions: [multi],
      attempts: [
        {
          id: 'a-wrong',
          questionId: 'q-multi',
          correct: false,
          selectedIndex: 1,
          responseMs: 1000,
          era: 'joseon-late',
          tags: ['political-system'],
          createdAt: '2026-09-10T00:00:00.000Z',
          source: 'practice',
        },
      ],
      cards: [],
      topics: TOPIC_CATALOG,
      completedLessonIds: [],
    })
    const marked = progress.filter((row) => row.memory === 'needs-check')
    expect(marked.length).toBeGreaterThan(0)
    expect(marked.every((row) => row.evidence.includes('추가 확인'))).toBe(true)
  })
})
