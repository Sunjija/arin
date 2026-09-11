import { addDays, daysBetween, parseDateKey } from './dates'
import { LEARNING_POLICY } from './learningPolicy'
import type { ExamDateMode, Lesson, LessonCompletion } from '../types'

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

export function normalizeStudyWeekdays(value: number[] | undefined | null): number[] {
  const unique = [...new Set((value ?? ALL_WEEKDAYS).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
  return unique.sort((a, b) => a - b)
}

export function weekdayOf(dateKey: string): number {
  return parseDateKey(dateKey).getDay()
}

export function isStudyWeekday(dateKey: string, weekdays: number[]): boolean {
  const allowed = normalizeStudyWeekdays(weekdays)
  if (allowed.length === 0) return false
  return allowed.includes(weekdayOf(dateKey))
}

/** `fromExclusive` 다음 날부터 학습 요일에 해당하는 날짜. */
export function nextStudyDate(fromExclusive: string, weekdays: number[]): string | null {
  const allowed = normalizeStudyWeekdays(weekdays)
  if (allowed.length === 0) return null
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = addDays(fromExclusive, offset)
    if (allowed.includes(weekdayOf(candidate))) return candidate
  }
  return null
}

export function countStudyDaysInclusive(start: string, end: string, weekdays: number[]): number {
  if (daysBetween(start, end) < 0) return 0
  const allowed = normalizeStudyWeekdays(weekdays)
  if (allowed.length === 0) return 0
  const length = daysBetween(start, end) + 1
  let count = Math.floor(length / 7) * allowed.length
  for (let i = 0; i < length % 7; i += 1) {
    if (allowed.includes(weekdayOf(addDays(start, i)))) count += 1
  }
  return count
}

export function countMissedStudyDays(input: {
  today: string
  startDate: string
  lastStudyDate: string | null
  studyWeekdays: number[]
}): number {
  const from = input.lastStudyDate ?? input.startDate
  if (daysBetween(from, input.today) <= 0) return 0
  const firstMissed = addDays(from, input.lastStudyDate ? 1 : 0)
  const lastMissed = addDays(input.today, -1)
  if (daysBetween(firstMissed, lastMissed) < 0) return 0
  return countStudyDaysInclusive(firstMissed, lastMissed, input.studyWeekdays)
}

export function classifyExamDate(
  examDate: string | null | undefined,
  undecided: boolean,
  today: string,
): ExamDateMode {
  if (undecided || !examDate) return 'undecided'
  return daysBetween(today, examDate) < 0 ? 'past' : 'scheduled'
}

export function reviewPeriodStart(examDate: string | null | undefined, reviewDays = LEARNING_POLICY.reviewPeriodDays): string | null {
  if (!examDate) return null
  return addDays(examDate, -Math.max(0, reviewDays))
}

export function remainingLessons(lessons: Lesson[], completions: LessonCompletion[]): Lesson[] {
  const done = new Set(completions.map((row) => row.lessonId))
  return [...lessons].sort((a, b) => a.week - b.week || a.dayOrder - b.dayOrder || a.id.localeCompare(b.id)).filter((lesson) => !done.has(lesson.id))
}

export function projectConceptFinishDate(input: {
  today: string
  remainingLessonCount: number
  dailyNewLessons?: number
  studyWeekdays: number[]
}): string | null {
  const remaining = Math.max(0, input.remainingLessonCount)
  if (remaining === 0) return input.today
  const perDay = Math.max(1, input.dailyNewLessons ?? LEARNING_POLICY.dailyNewConceptCountDefault)
  const studyDaysNeeded = Math.ceil(remaining / perDay)
  const allowed = normalizeStudyWeekdays(input.studyWeekdays)
  if (allowed.length === 0) return null

  let counted = 0
  let cursor = input.today
  for (let i = 0; i < 366 * 3; i += 1) {
    if (allowed.includes(weekdayOf(cursor))) {
      counted += 1
      if (counted >= studyDaysNeeded) return cursor
    }
    cursor = addDays(cursor, 1)
  }
  return null
}

export function remainingVolumeWarning(input: {
  remainingLessonCount: number
  conceptFinishDate: string | null
  examDate: string | null
  reviewPeriodStart: string | null
  examDateMode: ExamDateMode
}): string | null {
  if (input.remainingLessonCount <= 0) return null
  if (input.examDateMode === 'undecided') {
    return `시험일이 미정이면 남은 단원 ${input.remainingLessonCount}개를 완료 순서대로 이어 갑니다.`
  }
  if (input.examDateMode === 'past') {
    return `시험일 ${input.examDate}은 이미 지났습니다. 남은 단원 ${input.remainingLessonCount}개는 건너뛰지 않고 이어서 학습합니다.`
  }
  const deadline = input.reviewPeriodStart ?? input.examDate
  if (!deadline || !input.conceptFinishDate) {
    return `남은 단원 ${input.remainingLessonCount}개가 있습니다.`
  }
  if (daysBetween(input.conceptFinishDate, deadline) < 0) {
    return `남은 단원 ${input.remainingLessonCount}개는 최종 복습 시작일(${deadline}) 전에 끝나지 않습니다. 분량을 줄이거나 건너뛰지 않고 사실대로 표시합니다.`
  }
  return null
}
