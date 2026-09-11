import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { lessons } from '../data/lessons'
import {
  canTraverseAllLessons,
  lessonCompletionsFromStudyDays,
  lessonsAssignedInPlan,
  orderedLessons,
  selectNextLesson,
  selectScheduledLesson,
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

  it('assigns every lesson to concept study across the default 8-week calendar', () => {
    const startDate = '2026-01-05'
    const assigned = lessonsAssignedInPlan(lessons, startDate, 8)
    expect(assigned).toHaveLength(18)
    expect(new Set(assigned)).toEqual(new Set(lessons.map((lesson) => lesson.id)))
    expect(assigned[0]).toBe('lesson-01')
    expect(assigned).toContain('lesson-02')
    expect(assigned).toContain('lesson-18')
    const firstOfEachWeek = [
      ...new Set(
        [1, 2, 3, 4, 5, 6, 7, 8].map(
          (week) => lessons.find((lesson) => lesson.week === week)?.id,
        ),
      ),
    ]
    expect(assigned.length).toBeGreaterThan(firstOfEachWeek.length)
  })

  it('keeps the same lesson on refresh and uses extra weekdays as repeats', () => {
    const input = { startDate: '2026-01-05', today: '2026-01-08', planWeeks: 8 }
    const first = selectScheduledLesson(lessons, input)
    const again = selectScheduledLesson(lessons, input)
    expect(first.lesson.id).toBe(again.lesson.id)
    expect(first.kind).toBe('repeat')
    expect(selectScheduledLesson(lessons, { ...input, today: '2026-01-05' }).lesson.id).toBe(
      'lesson-01',
    )
    expect(selectScheduledLesson(lessons, { ...input, today: '2026-01-06' }).lesson.id).toBe(
      'lesson-02',
    )
  })

  it('keeps an in-progress session lesson instead of the calendar pick', () => {
    const picked = selectScheduledLesson(lessons, {
      startDate: '2026-01-05',
      today: '2026-01-06',
      planWeeks: 8,
      activeLessonId: 'lesson-01',
    })
    expect(picked).toMatchObject({ kind: 'resume', lesson: { id: 'lesson-01' } })
  })

  it('cycles all lessons after the plan weeks end', () => {
    const after = selectScheduledLesson(lessons, {
      startDate: '2026-01-05',
      today: addDays('2026-01-05', 56),
      planWeeks: 8,
    })
    expect(after.kind).toBe('after-plan')
    expect(lessons.some((lesson) => lesson.id === after.lesson.id)).toBe(true)
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
