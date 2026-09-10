import { defaultSettings } from '../data/defaults'
import type { UserSettings } from '../types'
import type { GoalGrade } from '../types/dailyLearning'
import { todayKey } from './clock'

export const GRADE_CUTOFF: Record<GoalGrade, number> = {
  1: 80,
  2: 70,
}

export function gradeFromScore(score: number): GoalGrade {
  return score >= 80 ? 1 : 2
}

export function normalizeSettings(settings: UserSettings | null | undefined): UserSettings {
  const base = settings ?? defaultSettings()
  const goalGrade = base.goalGrade ?? gradeFromScore(base.goalScore)
  return {
    ...base,
    startDate: base.startDate || todayKey(),
    goalGrade,
    examDate: base.examDate === undefined ? null : base.examDate,
    experienceLevel: base.experienceLevel ?? 'first-time',
    onboardingCompleted: Boolean(base.onboardingCompleted),
    diagnosticCompletedAt: base.diagnosticCompletedAt ?? null,
    diagnosticSkipped: Boolean(base.diagnosticSkipped),
  }
}
