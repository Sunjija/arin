import { defaultSettings } from '../data/defaults'
import type { GoalGrade, LearningGoal, UserSettings } from '../types'
import { LEARNING_POLICY } from './learningPolicy'
import { ALL_WEEKDAYS, normalizeStudyWeekdays } from './goalSchedule'
import { toDateKey } from './dates'

export function gradeFromScore(score: number): GoalGrade {
  return score >= LEARNING_POLICY.gradeCutoff[1] ? 1 : score >= LEARNING_POLICY.gradeCutoff[2] ? 2 : 3
}

export function scoreFromGrade(grade: GoalGrade, current?: number): number {
  const cutoff = LEARNING_POLICY.gradeCutoff[grade]
  if (current != null && Number.isFinite(current) && current >= cutoff) return current
  return cutoff
}

export function toLearningGoal(settings: UserSettings): LearningGoal {
  const normalized = normalizeSettings(settings)
  return {
    goalScore: normalized.goalScore,
    goalGrade: normalized.goalGrade ?? gradeFromScore(normalized.goalScore),
    dailyQuestionCount: normalized.dailyQuestionCount,
    dailyCardCount: normalized.dailyCardCount,
    dailyNewConceptCount: normalized.dailyNewConceptCount ?? LEARNING_POLICY.dailyNewConceptCountDefault,
    startDate: normalized.startDate,
    planWeeks: normalized.planWeeks,
    examRound: normalized.examRound ?? null,
    examDate: normalized.examDate ?? null,
    examDateUndecided: Boolean(normalized.examDateUndecided || !normalized.examDate),
    experienceLevel: normalized.experienceLevel ?? 'first-time',
    studyWeekdays: normalizeStudyWeekdays(normalized.studyWeekdays ?? [...ALL_WEEKDAYS]),
    officialScheduleSource: normalized.officialScheduleSource ?? null,
    officialScheduleCheckedAt: normalized.officialScheduleCheckedAt ?? null,
    onboardingCompleted: Boolean(normalized.onboardingCompleted),
  }
}

export function normalizeSettings(settings: UserSettings | null | undefined): UserSettings {
  const base = settings ?? defaultSettings()
  const examDate = base.examDate === undefined || base.examDate === '' ? null : base.examDate
  const undecided = base.examDateUndecided ?? examDate == null
  return {
    ...base,
    startDate: base.startDate || toDateKey(),
    goalGrade: base.goalGrade ?? gradeFromScore(base.goalScore),
    examRound: base.examRound ?? null,
    examDate: undecided ? null : examDate,
    examDateUndecided: undecided,
    experienceLevel: base.experienceLevel ?? 'first-time',
    studyWeekdays: normalizeStudyWeekdays(base.studyWeekdays ?? [...ALL_WEEKDAYS]),
    officialScheduleSource: base.officialScheduleSource ?? null,
    officialScheduleCheckedAt: base.officialScheduleCheckedAt ?? null,
    dailyNewConceptCount: Math.max(1, base.dailyNewConceptCount ?? LEARNING_POLICY.dailyNewConceptCountDefault),
    onboardingCompleted: Boolean(base.onboardingCompleted),
  }
}
