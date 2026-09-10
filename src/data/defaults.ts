import { ALL_ERAS, ALL_TYPES, type UserSettings } from '../types'
import { createInitialMastery } from '../lib/mastery'
import { toDateKey } from '../lib/dates'

export function defaultSettings(): UserSettings {
  return {
    goalScore: 85,
    dailyQuestionCount: 15,
    dailyCardCount: 10,
    dailyMinutes: 120,
    focusTypes: ['chronology', 'king-figure'],
    startDate: toDateKey(),
    planWeeks: 8,
    goalGrade: 1,
    examDate: null,
    experienceLevel: 'first-time',
    onboardingCompleted: false,
    diagnosticCompletedAt: null,
    diagnosticSkipped: false,
  }
}

export function defaultMastery() {
  return createInitialMastery(ALL_ERAS, ALL_TYPES, 22)
}

export const APP_NAME = '한사코치'
export const APP_TAGLINE = '한국사능력검정시험 심화 맞춤 학습'
