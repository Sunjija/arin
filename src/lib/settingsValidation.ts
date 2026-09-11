import { ALL_TYPES, type QuestionType, type UserSettings } from '../types'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS } from './studyLimits'
import { isDateKey } from './dates'
import type { SaveGoalInput } from '../types/learning'

export function validateGoalInput(input: SaveGoalInput): string | null {
  const ranges: Array<[number | undefined | null, number, number, string]> = [
    [input.goalScore, 60, 100, '목표 점수'], [input.dailyQuestionCount, 5, 40, '하루 문제 수'],
    [input.dailyCardCount, MIN_DAILY_CARDS, MAX_DAILY_CARDS, '하루 카드 수'],
    [input.dailyNewConceptCount, 1, 20, '하루 새 개념 수'], [input.planWeeks, 4, 16, '계획 주수'], [input.examRound, 1, 9999, '시험 회차'],
  ]
  for (const [value, min, max, label] of ranges) {
    if (value != null && (!Number.isInteger(value) || value < min || value > max)) return `${label}는 ${min}에서 ${max} 사이의 정수로 입력하세요.`
  }
  if (input.conceptTargetDate != null && !isDateKey(input.conceptTargetDate)) return '실제로 존재하는 개념 목표일을 입력하세요.'
  if (input.paceMode !== undefined && !['auto', 'manual'].includes(input.paceMode)) return '학습 분량 방식이 올바르지 않습니다.'
  if (input.focusTypes !== undefined && (!Array.isArray(input.focusTypes) || input.focusTypes.some(type => !ALL_TYPES.includes(type)))) return '집중 유형이 올바르지 않습니다.'
  if (input.examDate != null && !isDateKey(input.examDate)) return '실제로 존재하는 시험 날짜를 입력하세요.'
  if (input.startDate !== undefined && !isDateKey(input.startDate)) return '학습 시작일이 올바르지 않습니다.'
  if (input.goalGrade !== undefined && ![1, 2, 3].includes(input.goalGrade)) return '목표 급수가 올바르지 않습니다.'
  if (input.experienceLevel !== undefined && !['first-time', 'has-experience'].includes(input.experienceLevel)) return '학습 경험이 올바르지 않습니다.'
  if (input.studyWeekdays !== undefined && (!Array.isArray(input.studyWeekdays) || !input.studyWeekdays.length || input.studyWeekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) return '학습 요일을 하루 이상 선택하세요.'
  if ([input.onboardingCompleted, input.examDateUndecided].some(value => value !== undefined && typeof value !== 'boolean')) return '목표 설정 상태가 올바르지 않습니다.'
  if (input.officialScheduleSource != null && (typeof input.officialScheduleSource !== 'string' || !/^https?:\/\//.test(input.officialScheduleSource))) return '공식 일정 출처 URL이 올바르지 않습니다.'
  if (input.officialScheduleCheckedAt != null && !isDateKey(input.officialScheduleCheckedAt)) return '일정 확인 날짜가 올바르지 않습니다.'
  return null
}

export const GOAL_SCORE_MIN = 60
export const GOAL_SCORE_MAX = 100
export const DAILY_QUESTION_MIN = 5
export const DAILY_QUESTION_MAX = 40
export const DAILY_MINUTES_MIN = 30
export const DAILY_MINUTES_MAX = 300
export const PLAN_WEEKS_MIN = 4
export const PLAN_WEEKS_MAX = 16

const SETTINGS_KEYS = [
  'goalScore',
  'dailyQuestionCount',
  'dailyCardCount',
  'dailyMinutes',
  'focusTypes',
  'startDate',
  'planWeeks',
] as const

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidNumber(value: unknown): boolean {
  return typeof value !== 'number' || !Number.isFinite(value)
}

export function validateSettingsForm(settings: UserSettings): string[] {
  const errors: string[] = []

  if (invalidNumber(settings.goalScore) || !Number.isInteger(settings.goalScore)) {
    errors.push('목표 점수는 정수로 입력하세요.')
  } else if (settings.goalScore < GOAL_SCORE_MIN || settings.goalScore > GOAL_SCORE_MAX) {
    errors.push(`목표 점수는 ${GOAL_SCORE_MIN}점에서 ${GOAL_SCORE_MAX}점 사이입니다.`)
  }

  if (invalidNumber(settings.dailyQuestionCount) || !Number.isInteger(settings.dailyQuestionCount)) {
    errors.push('하루 문제 수는 정수로 입력하세요.')
  } else if (
    settings.dailyQuestionCount < DAILY_QUESTION_MIN ||
    settings.dailyQuestionCount > DAILY_QUESTION_MAX
  ) {
    errors.push(`하루 문제 수는 ${DAILY_QUESTION_MIN}개에서 ${DAILY_QUESTION_MAX}개 사이입니다.`)
  }

  if (invalidNumber(settings.dailyCardCount) || !Number.isInteger(settings.dailyCardCount)) {
    errors.push('하루 카드 수는 정수로 입력하세요.')
  } else if (
    settings.dailyCardCount < MIN_DAILY_CARDS ||
    settings.dailyCardCount > MAX_DAILY_CARDS
  ) {
    errors.push(`하루 카드 수는 ${MIN_DAILY_CARDS}장에서 ${MAX_DAILY_CARDS}장 사이입니다.`)
  }

  if (invalidNumber(settings.dailyMinutes) || !Number.isInteger(settings.dailyMinutes)) {
    errors.push('하루 학습 시간은 정수(분)로 입력하세요.')
  } else if (settings.dailyMinutes < DAILY_MINUTES_MIN || settings.dailyMinutes > DAILY_MINUTES_MAX) {
    errors.push(`하루 학습 시간은 ${DAILY_MINUTES_MIN}분에서 ${DAILY_MINUTES_MAX}분 사이입니다.`)
  }

  if (invalidNumber(settings.planWeeks) || !Number.isInteger(settings.planWeeks)) {
    errors.push('계획 주수는 정수로 입력하세요.')
  } else if (settings.planWeeks < PLAN_WEEKS_MIN || settings.planWeeks > PLAN_WEEKS_MAX) {
    errors.push(`계획 주수는 ${PLAN_WEEKS_MIN}주에서 ${PLAN_WEEKS_MAX}주 사이입니다.`)
  }

  if (!Array.isArray(settings.focusTypes)) {
    errors.push('집중 유형이 올바르지 않습니다.')
  }

  return errors
}

export function parseUserSettings(
  raw: unknown,
): { ok: true; value: UserSettings } | { ok: false; message: string } {
  if (!isRecord(raw)) return { ok: false, message: '설정 기록이 없습니다.' }
  for (const key of SETTINGS_KEYS) {
    if (!(key in raw)) return { ok: false, message: `설정 필드가 없습니다: ${key}` }
  }
  if (!Array.isArray(raw.focusTypes)) {
    return { ok: false, message: '집중 유형이 올바르지 않습니다.' }
  }
  const invalidType = raw.focusTypes.some(
    (type) => typeof type !== 'string' || !ALL_TYPES.includes(type as QuestionType),
  )
  if (invalidType) {
    return { ok: false, message: '집중 유형이 올바르지 않습니다.' }
  }
  if (!isDateKey(raw.startDate)) {
    return { ok: false, message: '학습 시작일이 올바르지 않습니다.' }
  }

  const goalError = validateGoalInput(raw as SaveGoalInput)
  if (goalError) return { ok: false, message: goalError }

  const settings: UserSettings = {
    paceMode: raw.paceMode === 'manual' ? 'manual' : 'auto',
    conceptTargetDate: typeof raw.conceptTargetDate === 'string' ? raw.conceptTargetDate : null,
    goalScore: raw.goalScore as number,
    dailyQuestionCount: raw.dailyQuestionCount as number,
    dailyCardCount: raw.dailyCardCount as number,
    dailyMinutes: raw.dailyMinutes as number,
    focusTypes: [...(raw.focusTypes as QuestionType[])],
    startDate: raw.startDate,
    planWeeks: raw.planWeeks as number,
    goalGrade: raw.goalGrade === 1 || raw.goalGrade === 2 || raw.goalGrade === 3 ? raw.goalGrade : undefined,
    dailyNewConceptCount:
      typeof raw.dailyNewConceptCount === 'number' && Number.isFinite(raw.dailyNewConceptCount)
        ? raw.dailyNewConceptCount
        : undefined,
    examRound: typeof raw.examRound === 'number' ? raw.examRound : raw.examRound === null ? null : undefined,
    examDate: typeof raw.examDate === 'string' && DATE_KEY.test(raw.examDate) ? raw.examDate : raw.examDate === null ? null : undefined,
    examDateUndecided: typeof raw.examDateUndecided === 'boolean' ? raw.examDateUndecided : undefined,
    experienceLevel:
      raw.experienceLevel === 'first-time' || raw.experienceLevel === 'has-experience'
        ? raw.experienceLevel
        : undefined,
    studyWeekdays: Array.isArray(raw.studyWeekdays)
      ? raw.studyWeekdays.filter((day): day is number => typeof day === 'number' && day >= 0 && day <= 6)
      : undefined,
    officialScheduleSource:
      typeof raw.officialScheduleSource === 'string' || raw.officialScheduleSource === null
        ? raw.officialScheduleSource
        : undefined,
    officialScheduleCheckedAt:
      typeof raw.officialScheduleCheckedAt === 'string' || raw.officialScheduleCheckedAt === null
        ? raw.officialScheduleCheckedAt
        : undefined,
    onboardingCompleted: typeof raw.onboardingCompleted === 'boolean' ? raw.onboardingCompleted : undefined,
  }
  const errors = validateSettingsForm(settings)
  if (errors.length > 0) return { ok: false, message: errors[0]! }
  return { ok: true, value: settings }
}

export function parseBackupFileText(
  text: string,
): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, message: 'JSON 파일을 읽지 못했습니다. 파일 내용을 확인해 주세요.' }
  }
}
