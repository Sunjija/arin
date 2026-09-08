import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../../data/defaults'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS } from '../../lib/studyLimits'
import {
  DAILY_MINUTES_MAX,
  DAILY_QUESTION_MAX,
  GOAL_SCORE_MAX,
  GOAL_SCORE_MIN,
  parseBackupFileText,
  validateSettingsForm,
} from './settingsValidation'

describe('settings runtime validation', () => {
  it('accepts the default settings without relying on HTML min/max', () => {
    expect(validateSettingsForm(defaultSettings())).toEqual([])
  })

  it('rejects out-of-range goal, quantity, and time even if a number input would clamp', () => {
    const base = defaultSettings()
    expect(validateSettingsForm({ ...base, goalScore: GOAL_SCORE_MIN - 1 }).join('\n')).toContain(
      '목표 점수',
    )
    expect(validateSettingsForm({ ...base, goalScore: GOAL_SCORE_MAX + 1 }).join('\n')).toContain(
      '목표 점수',
    )
    expect(validateSettingsForm({ ...base, goalScore: Number.NaN }).join('\n')).toContain('정수')
    expect(validateSettingsForm({ ...base, dailyQuestionCount: DAILY_QUESTION_MAX + 1 }).join('\n')).toContain(
      '하루 문제 수',
    )
    expect(validateSettingsForm({ ...base, dailyCardCount: MIN_DAILY_CARDS - 1 }).join('\n')).toContain(
      '하루 카드 수',
    )
    expect(validateSettingsForm({ ...base, dailyCardCount: MAX_DAILY_CARDS + 1 }).join('\n')).toContain(
      '하루 카드 수',
    )
    expect(validateSettingsForm({ ...base, dailyMinutes: DAILY_MINUTES_MAX + 1 }).join('\n')).toContain(
      '하루 학습 시간',
    )
    expect(validateSettingsForm({ ...base, planWeeks: 3 }).join('\n')).toContain('계획 주수')
  })
})

describe('backup import failure copy', () => {
  it('keeps invalid JSON on the current screen as an error message', () => {
    const result = parseBackupFileText('{not json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('JSON')
    }
  })

  it('parses an object so restoreBackup can reject it', () => {
    const result = parseBackupFileText('{"version":0}')
    expect(result).toEqual({ ok: true, value: { version: 0 } })
  })
})
