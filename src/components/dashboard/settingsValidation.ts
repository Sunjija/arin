import { MAX_DAILY_CARDS, MIN_DAILY_CARDS } from '../../lib/studyLimits'
import type { UserSettings } from '../../types'

export const GOAL_SCORE_MIN = 60
export const GOAL_SCORE_MAX = 100
export const DAILY_QUESTION_MIN = 5
export const DAILY_QUESTION_MAX = 40
export const DAILY_MINUTES_MIN = 30
export const DAILY_MINUTES_MAX = 300
export const PLAN_WEEKS_MIN = 4
export const PLAN_WEEKS_MAX = 16

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

  return errors
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
