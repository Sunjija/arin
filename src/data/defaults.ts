import { ALL_ERAS, ALL_TYPES, type UserSettings } from '../types'
import { createInitialMastery } from '../lib/mastery'
import { toDateKey } from '../lib/dates'
import { ALL_WEEKDAYS } from '../lib/goalSchedule'
import { LEARNING_POLICY } from '../lib/learningPolicy'

export function defaultSettings(): UserSettings {
  return {
    goalScore: 85,
    goalGrade: 1,
    dailyQuestionCount: 15,
    dailyCardCount: 10,
    dailyNewConceptCount: LEARNING_POLICY.dailyNewConceptCountDefault,
    dailyMinutes: 120,
    focusTypes: ['chronology', 'king-figure'],
    startDate: toDateKey(),
    planWeeks: 8,
    examRound: null,
    examDate: null,
    examDateUndecided: true,
    experienceLevel: 'first-time',
    studyWeekdays: [...ALL_WEEKDAYS],
    officialScheduleSource: null,
    officialScheduleCheckedAt: null,
    onboardingCompleted: false,
  }
}

export function defaultMastery() {
  return createInitialMastery(ALL_ERAS, ALL_TYPES, 50)
}

export const APP_NAME = '한사코치'
export const APP_TAGLINE = '한국사능력검정시험 심화 맞춤 학습'
