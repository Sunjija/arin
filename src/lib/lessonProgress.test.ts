import { describe, expect, it } from 'vitest'
import { lessons } from '../data/lessons'
import {
  canTraverseAllLessons,
  lessonCompletionsFromStudyDays,
  orderedLessons,
  selectNextLesson,
} from './lessonProgress'

describe('lesson progress', () => {
  it('orders 18 lessons by week then dayOrder without skipping later days', () => {
    const ordered = orderedLessons(lessons)
    expect(ordered).toHaveLength(18)
    expect(new Set(ordered.map((lesson) => lesson.id)).size).toBe(18)
    expect(ordered[0]?.id).toBe('lesson-01')
    expect(ordered[1]?.id).toBe('lesson-02')
    expect(ordered.at(-1)?.week).toBe(8)
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1]!
      const curr = ordered[i]!
      expect(prev.week < curr.week || (prev.week === curr.week && prev.dayOrder <= curr.dayOrder)).toBe(true)
    }
  })

  it('does not pick only the first lesson of a calendar week', () => {
    const first = selectNextLesson(lessons, [])
    expect(first.id).toBe('lesson-01')
    const second = selectNextLesson(lessons, [
      {
        lessonId: 'lesson-01',
        firstCompletedAt: '2026-01-01',
        lastCompletedAt: '2026-01-01',
        completionCount: 1,
      },
    ])
    expect(second.id).toBe('lesson-02')
    expect(second.week).toBe(first.week)
  })

  it('keeps an active session lesson instead of advancing', () => {
    const next = selectNextLesson(
      lessons,
      [
        {
          lessonId: 'lesson-01',
          firstCompletedAt: '2026-01-01',
          lastCompletedAt: '2026-01-01',
          completionCount: 1,
        },
      ],
      'lesson-01',
    )
    expect(next.id).toBe('lesson-01')
  })

  it('can walk all 18 lessons by completion', () => {
    expect(canTraverseAllLessons(lessons)).toBe(true)
  })

  it('migrates only completed studyDays with lessonId', () => {
    const rows = lessonCompletionsFromStudyDays([
      {
        date: '2026-01-02',
        completed: true,
        cardsReviewed: 3,
        conceptDone: true,
        questionsAnswered: 4,
        correctCount: 2,
        lessonId: 'lesson-02',
        minutesSpent: 20,
      },
      {
        date: '2026-01-01',
        completed: false,
        cardsReviewed: 1,
        conceptDone: false,
        questionsAnswered: 0,
        correctCount: 0,
        lessonId: 'lesson-01',
        minutesSpent: 5,
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.lessonId).toBe('lesson-02')
  })
})
