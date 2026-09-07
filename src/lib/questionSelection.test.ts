import { describe, expect, it } from 'vitest'
import { ensureUnique, selectDailyQuestions, splitQuotas } from './questionSelection'
import type { Question } from '../types'

function q(partial: Partial<Question> & Pick<Question, 'id' | 'era' | 'tags'>): Question {
  return {
    stem: partial.id,
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: 'x',
    difficulty: 2,
    source: '자체 제작 학습문항',
    sourceUrl: '',
    license: '학습용 자체 제작',
    imageRights: '이미지 없음',
    ...partial,
  }
}

describe('selectDailyQuestions', () => {
  const pool = Array.from({ length: 40 }, (_, i) =>
    q({
      id: `q${i}`,
      era: i % 2 === 0 ? 'goryeo' : 'modern',
      tags: i % 3 === 0 ? ['chronology'] : ['source'],
      lessonId: i < 5 ? 'lesson-04' : undefined,
    }),
  )

  it('요청 개수만큼 고르고 세션 내 중복이 없다', () => {
    const selected = selectDailyQuestions({
      questions: pool,
      masteryEras: {
        prehistoric: 50,
        'three-kingdoms': 50,
        'north-south': 50,
        goryeo: 10,
        'joseon-early': 50,
        'joseon-late': 50,
        opening: 50,
        colonial: 50,
        modern: 80,
        culture: 50,
      },
      masteryTypes: {
        'king-figure': 20,
        chronology: 15,
        source: 70,
        'cultural-heritage': 70,
        'independence-org': 70,
        'political-system': 70,
      },
      recentWrongIds: ['q1', 'q2'],
      dueReviewQuestionIds: ['q3'],
      todayLessonId: 'lesson-04',
      todayLessonEra: 'goryeo',
      count: 15,
    })
    expect(selected).toHaveLength(15)
    expect(ensureUnique(selected)).toHaveLength(15)
    expect(new Set(selected.map((x) => x.id)).size).toBe(15)
  })

  it('비율 합이 전체 개수와 같다', () => {
    const quotas = splitQuotas(15)
    expect(quotas.weak + quotas.review + quotas.today + quotas.maintain).toBe(15)
  })
})
