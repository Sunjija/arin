import { daysBetween } from './dates'
import { DAILY_LEARNING_POLICY } from './dailyLearningPolicy'
import type { Lesson, UserSettings } from '../types'
import type { ExamPressure } from '../types/dailyLearning'

export function remainingLessons(
  lessons: Lesson[],
  completedLessonIds: Iterable<string>,
): Lesson[] {
  const done = new Set(completedLessonIds)
  return lessons.filter((lesson) => !done.has(lesson.id))
}

export function computeExamPressure(input: {
  today: string
  settings: UserSettings
  lessons: Lesson[]
  completedLessonIds: Iterable<string>
}): ExamPressure {
  const examDate = input.settings.examDate ?? null
  const leftover = remainingLessons(input.lessons, input.completedLessonIds)
  const remainingMinutesEstimate = leftover.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes || DAILY_LEARNING_POLICY.minutesPerNewConcept),
    0,
  )
  const daysLeft = examDate ? Math.max(0, daysBetween(input.today, examDate)) : null
  const horizonDays = daysLeft == null ? input.settings.planWeeks * 7 : Math.max(daysLeft, 1)
  const availableMinutes = horizonDays * input.settings.dailyMinutes
  const feasible = remainingMinutesEstimate <= availableMinutes
  const days = daysLeft

  let message: string
  if (!examDate || days == null) {
    message = '응시일이 아직 미정입니다. 범위 추정은 계획 주수를 기준으로 한 참고값입니다.'
  } else if (days === 0) {
    message = feasible
      ? '시험이 오늘입니다. 남은 복습을 우선하고, 합격 가능성은 예측하지 않습니다.'
      : '시험이 오늘인데 아직 다루지 않은 단원이 있습니다. 남은 시간 안에 전 범위를 끝낸다고 단정하지 않습니다.'
  } else if (!feasible) {
    message = `시험까지 ${days}일인데 아직 ${leftover.length}개 단원이 남아 있습니다. 지금 속도로는 전 범위를 다루기 어렵습니다. 합격 가능성은 예측하지 않습니다.`
  } else if (days <= DAILY_LEARNING_POLICY.examUrgentDays) {
    message = `시험까지 ${days}일입니다. 새 개념보다 도래한 복습을 우선합니다. 예상 합격은 표시하지 않습니다.`
  } else if (days <= DAILY_LEARNING_POLICY.examSoonDays) {
    message = `시험까지 ${days}일입니다. 남은 단원 ${leftover.length}개를 현재 하루 시간에 맞춰 배정합니다.`
  } else {
    message = `시험까지 ${days}일, 아직 안 본 단원 ${leftover.length}개입니다.`
  }

  return {
    examDate,
    daysLeft,
    remainingLessons: leftover.length,
    remainingMinutesEstimate,
    availableMinutes,
    feasible,
    message,
  }
}
