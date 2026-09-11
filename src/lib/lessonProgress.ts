import { addDays, daysBetween, planWeekNumber } from './dates'
import type { Lesson, LessonCompletion, StudyDayRecord } from '../types'

export type LessonScheduleKind = 'resume' | 'scheduled' | 'repeat' | 'after-plan'

export function orderedLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort(
    (a, b) => a.week - b.week || a.dayOrder - b.dayOrder || a.id.localeCompare(b.id),
  )
}

export function completedLessonIds(completions: LessonCompletion[]): Set<string> {
  return new Set(completions.map((row) => row.lessonId))
}

export function dayIndexInPlan(startDate: string, today: string): number {
  return Math.max(0, daysBetween(startDate, today))
}

export function lessonsForWeek(lessons: Lesson[], week: number): Lesson[] {
  return orderedLessons(lessons).filter((lesson) => lesson.week === week)
}

/**
 * 8주 달력: 해당 주의 dayOrder 순 단원을 주 내 날짜에 배정한다.
 * 단원이 7일보다 적으면 남은 날은 그 주 단원을 순환(반복 학습일).
 * 계획 주수가 끝나면 18개 단원 전체를 날짜 기준으로 순환한다.
 * 활성 세션 lessonId가 있으면 재개 시 바꾸지 않는다.
 */
export function selectScheduledLesson(
  lessons: Lesson[],
  input: {
    startDate: string
    today: string
    planWeeks: number
    activeLessonId?: string | null
  },
): { lesson: Lesson; kind: LessonScheduleKind } {
  const ordered = orderedLessons(lessons)
  if (ordered.length === 0) {
    throw new Error('학습 단원이 없습니다.')
  }
  if (input.activeLessonId) {
    const active = ordered.find((lesson) => lesson.id === input.activeLessonId)
    if (active) return { lesson: active, kind: 'resume' }
  }

  const elapsed = dayIndexInPlan(input.startDate, input.today)
  const planDays = Math.max(1, input.planWeeks) * 7
  if (elapsed >= planDays) {
    return { lesson: ordered[elapsed % ordered.length]!, kind: 'after-plan' }
  }

  const week = planWeekNumber(input.startDate, input.today, input.planWeeks)
  const weekLessons = lessonsForWeek(lessons, week)
  if (weekLessons.length === 0) {
    return { lesson: ordered[elapsed % ordered.length]!, kind: 'repeat' }
  }
  const dayInWeek = elapsed % 7
  return {
    lesson: weekLessons[dayInWeek % weekLessons.length]!,
    kind: dayInWeek >= weekLessons.length ? 'repeat' : 'scheduled',
  }
}

export function lessonsAssignedInPlan(
  lessons: Lesson[],
  startDate: string,
  planWeeks: number,
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (let day = 0; day < planWeeks * 7; day += 1) {
    const today = addDays(startDate, day)
    const id = selectScheduledLesson(lessons, { startDate, today, planWeeks }).lesson.id
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

/**
 * 완료 기반으로 다음 단원을 고른다. week의 첫 lesson.find를 쓰지 않는다.
 * 활성 세션의 lessonId가 있으면 재개 시 바꾸지 않는다.
 */
export function selectNextLesson(
  lessons: Lesson[],
  completions: LessonCompletion[],
  activeLessonId?: string | null,
): Lesson {
  const ordered = orderedLessons(lessons)
  if (ordered.length === 0) {
    throw new Error('학습 단원이 없습니다.')
  }
  if (activeLessonId) {
    const active = ordered.find((lesson) => lesson.id === activeLessonId)
    if (active) return active
  }
  const done = completedLessonIds(completions)
  return ordered.find((lesson) => !done.has(lesson.id)) ?? ordered[ordered.length - 1]!
}

export function canTraverseAllLessons(lessons: Lesson[]): boolean {
  const ordered = orderedLessons(lessons)
  const seen = new Set<string>()
  const completions: LessonCompletion[] = []
  for (let i = 0; i < ordered.length; i += 1) {
    const next = selectNextLesson(ordered, completions)
    if (seen.has(next.id)) return false
    seen.add(next.id)
    completions.push({
      lessonId: next.id,
      firstCompletedAt: '2026-01-01',
      lastCompletedAt: '2026-01-01',
      completionCount: 1,
    })
  }
  return seen.size === ordered.length
}

/** 기존 studyDays에서 복원 가능한 완료만. 없는 진도를 추정하지 않는다. */
export function lessonCompletionsFromStudyDays(days: StudyDayRecord[]): LessonCompletion[] {
  const byLesson = new Map<string, LessonCompletion>()
  const chronological = [...days].sort((a, b) => a.date.localeCompare(b.date))
  for (const day of chronological) {
    if (!day.completed || !day.lessonId) continue
    const existing = byLesson.get(day.lessonId)
    if (existing) {
      existing.lastCompletedAt = day.date
      existing.completionCount += 1
    } else {
      byLesson.set(day.lessonId, {
        lessonId: day.lessonId,
        firstCompletedAt: day.date,
        lastCompletedAt: day.date,
        completionCount: 1,
      })
    }
  }
  return [...byLesson.values()]
}

export function upsertLessonCompletion(
  existing: LessonCompletion | undefined,
  lessonId: string,
  at: string,
): LessonCompletion {
  if (!existing) {
    return {
      lessonId,
      firstCompletedAt: at,
      lastCompletedAt: at,
      completionCount: 1,
    }
  }
  return {
    ...existing,
    lastCompletedAt: at,
    completionCount: existing.completionCount + 1,
  }
}
